import { createOtpHash } from "@/helpers/generateOtp";
import { normalizeIndianPhoneNumber } from "@/helpers/validatePhone";
import { dbConnect } from "@/lib/dbConnect";
import { UserModel } from "@/models/user.model";
import crypto from "crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";


const cookieOptionDefaults = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
  path: "/",
  maxAge: 7 * 24 * 60 * 60, // 7 days
};

export async function POST(request) {
  await dbConnect();

  try {
    const { identifier, otp } = await request.json();

    if (!identifier || !otp) {
      return NextResponse.json(
        { success: false, message: "Identifier or OTP is missing" },
        { status: 400 }
      );
    }

    const normalizedPhone = normalizeIndianPhoneNumber(identifier);
    const isPhone = !!normalizedPhone;

    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[A-Za-z]{2,}$/;
    const isEmail = !isPhone && emailRegex.test(identifier);
    const normalizedEmail = isEmail && identifier.trim().toLowerCase();

    if (!isPhone && !isEmail) {
      return NextResponse.json(
        { success: false, message: "Please enter a valid phone number or email" },
        { status: 400 }
      );
    }

    const query = isPhone ? { phone: normalizedPhone } : { email: normalizedEmail };
    const user = await UserModel.findOne(query);

    if (!user || !user.otp || !user.otp.otpHash) {
      return NextResponse.json(
        { success: false, message: "No OTP request found. Please request a new code." },
        { status: 400 }
      );
    }

    if (new Date(user.otp.expiresAt).getTime() < Date.now()) {
      user.otp = undefined;
      await user.save();
      return NextResponse.json({ success: false, message: "OTP has expired" }, { status: 400 });
    }

    const candidateHash = await createOtpHash(otp);

    let isOtpVerified = false;

    try {
      const a = Buffer.from(user.otp.otpHash, "hex");
      const b = Buffer.from(candidateHash, "hex");
      if (a.length === b.length && crypto.timingSafeEqual(a, b)) {
        isOtpVerified = true;
      }
    } catch (err) {
      console.error("Error comparing OTP hashes:", err);
      return NextResponse.json({ success: false, message: "OTP verification failed" }, { status: 500 });
    }

    if (!isOtpVerified) {
      return NextResponse.json({ success: false, message: "Incorrect OTP" }, { status: 400 });
    }


    if (isPhone) {
      user.phoneVerified = true;
    } else {
      user.emailVerified = true;
    }

    
    const refreshToken = await user.generateRefreshToken();
    
    user.otp = undefined;
    await user.save();

    const cookieStore = await cookies();

    cookieStore.set({
      name: "refreshToken",
      value: refreshToken,
      ...cookieOptionDefaults,
    });

    const body = {
      success: true,
      message: "OTP verified successfully",
      id: String(user._id),
    };

    return NextResponse.json(body, { status: 200 });
  } catch (err) {
    console.error("POST /auth/verify-otp", err);
    return NextResponse.json({ success: false, message: "Internal Server Error" }, { status: 500 });
  }
}
