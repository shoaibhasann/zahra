import { createOtpHash } from "@/helpers/generateOtp";
import { normalizeIndianPhoneNumber } from "@/helpers/validatePhone";
import { dbConnect } from "@/lib/dbConnect";
import { UserModel } from "@/models/user.model";
import crypto from "crypto";
import { cookies } from "next/headers";

const ACCESS_TOKEN_MAX_AGE = 15 * 60; // 15 minutes (seconds)
const REFRESH_TOKEN_MAX_AGE = 7 * 24 * 60 * 60; // 7 days (seconds)
const COOKIE_PATH = "/";

const cookieOptionDefaults = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
  path: COOKIE_PATH,
};

export async function POST(request) {
  await dbConnect();

  try {
    const { identifier, otp } = await request.json();

    if (!identifier || !otp) {
      return Response.json(
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
      return Response.json(
        { success: false, message: "Please enter a valid phone number or email" },
        { status: 400 }
      );
    }

    const query = isPhone ? { phone: normalizedPhone } : { email: normalizedEmail };
    const user = await UserModel.findOne(query);

    if (!user || !user.otp || !user.otp.otpHash) {
      return Response.json(
        { success: false, message: "No OTP request found. Please request a new code." },
        { status: 400 }
      );
    }

    if (new Date(user.otp.expiresAt).getTime() < Date.now()) {
      user.otp = undefined;
      await user.save();
      return Response.json({ success: false, message: "OTP has expired" }, { status: 400 });
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
      return Response.json({ success: false, message: "OTP verification failed" }, { status: 500 });
    }

    if (!isOtpVerified) {
      return Response.json({ success: false, message: "Incorrect OTP" }, { status: 400 });
    }


    if (isPhone) {
      user.phoneVerified = true;
    } else {
      user.emailVerified = true;
    }

    user.otp = undefined;

    const { refreshToken, sessionId, refreshExpiresAt } = await user.createSession();

    const accessToken = await user.generateAccessToken(sessionId);

    await user.save();

    const cookieStore = cookies();

    cookieStore.set({
      name: "accessToken",
      value: accessToken,
      maxAge: ACCESS_TOKEN_MAX_AGE,
      ...cookieOptionDefaults,
    });

    cookieStore.set({
      name: "refreshToken",
      value: refreshToken,
      maxAge: REFRESH_TOKEN_MAX_AGE,
      ...cookieOptionDefaults,
    });

    const body = {
      success: true,
      message: "OTP verified successfully",
      id: String(user._id),
      sessionId,
      refreshExpiresAt,
    };

    return Response.json(body, { status: 200 });
  } catch (error) {
    console.error("Error while verifying OTP:", error);
    return Response.json({ success: false, message: "Internal Server Error" }, { status: 500 });
  }
}
