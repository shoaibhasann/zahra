import { createOtpHash } from "@/helpers/generateOtp";
import { dbConnect } from "@/lib/dbConnect";
import { UserModel } from "@/models/user.model";
import { NextResponse } from "next/server";
import crypto from "crypto";  

export async function POST(request) {
  await dbConnect();
  try {
    const body = await request.json();
    const { otp: plainOtp } = body;
    const { user: userId } = await request.user;

    if(!plainOtp || plainOtp.trim().length !== 6){
        return NextResponse.json({
            success: false,
            message: "Invalid OTP"
        })
    }

    const userExists = await UserModel.findById(userId).select(
      "-otp -lastOtpSentAt -otpRequestCount"
    );

    if(!userExists){
        return NextResponse.json({
            success: false,
            message: "User not found"
        }, { status: 401})
    }

    if(!userExists.pendingPhone || !userExists.pendingPhone.otpHash){
         return NextResponse.json(
           {
             success: false,
             message: "No OTP request found. Please request a new code.",
           },
           { status: 400 }
         );
    }

    if(new Date(userExists.pendingPhone.expiresAt).getTime() < Date.now()){
        userExists.pendingPhone = undefined;
        await userExists.save();
        return NextResponse.json({ success: false, message: "OTP has expired" }, { status: 400 });
    }

    const candidateHash = await createOtpHash(plainOtp);
    let isOtpVerified = false;

    try {
        const a = Buffer.from(candidateHash, "hex");
        const b = Buffer.from(userExists.pendingPhone.otpHash, "hex");

        if(a.length === b.length && crypto.timingSafeEqual(a,b)){
            isOtpVerified = true;
        }

    } catch (error) {
        console.error("Error comparing OTP hashes:", err);
        return NextResponse.json(
          { success: false, message: "OTP verification failed" },
          { status: 500 }
        );
    }

    if (!isOtpVerified) {
          return NextResponse.json({ success: false, message: "Incorrect OTP" }, { status: 400 });
     }

     userExists.phone = user.pendingPhone.value;
     userExists.pendingPhone = undefined;
     await userExists.save();

     return NextResponse.json({
        success: true,
        message: "Phone number updated successfully"
     }, { status: 200 });

  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: "Error: while verifying otp",
      },
      { status: 500 }
    );
  }
}
