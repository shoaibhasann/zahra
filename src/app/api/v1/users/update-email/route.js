import { createOtpHash } from "@/helpers/generateOtp";
import { dbConnect } from "@/lib/dbConnect";
import { UserModel } from "@/models/user.model";
import { NextResponse } from "next/server";
import crypto from "crypto";  
import { getUserId } from "@/helpers/getUserId";

export async function POST(request) {
  await dbConnect();
  try {
    const userId = getUserId(request);

    if(!userId){
      return NextResponse.json({
        success: false,
        message: "Unauthorized, please login first"
      });
    }
    
    const { otp: plainOtp } = await request.json();

    if(!plainOtp || plainOtp.trim().length !== 6){
        return NextResponse.json({
            success: false,
            message: "Invalid OTP"
        })
    }

    const existingUser = await UserModel.findById(userId).select(
      "-otp -lastOtpSentAt -otpRequestCount"
    );

    if(!existingUser){
        return NextResponse.json({
            success: false,
            message: "User not found"
        }, { status: 401})
    }

    if(!existingUser.pendingEmail || !existingUser.pendingEmail.otpHash){
         return NextResponse.json(
           {
             success: false,
             message: "No OTP request found. Please request a new code.",
           },
           { status: 400 }
         );
    }

    if(new Date(existingUser.pendingEmail.expiresAt).getTime() < Date.now()){
        existingUser.pendingEmail = undefined;
        await existingUser.save();
        return NextResponse.json({ success: false, message: "OTP has expired" }, { status: 400 });
    }

    const candidateHash = await createOtpHash(plainOtp);
    let isOtpVerified = false;

    try {
        const a = Buffer.from(candidateHash, "hex");
        const b = Buffer.from(existingUser.pendingEmail.otpHash, "hex");

        if(a.length === b.length && crypto.timingSafeEqual(a,b)){
            isOtpVerified = true;
        }

    } catch (error) {
        console.error("Error comparing OTP hashes:", error);
        return NextResponse.json(
          { success: false, message: "OTP verification failed" },
          { status: 500 }
        );
    }

    if (!isOtpVerified) {
          return NextResponse.json({ success: false, message: "Incorrect OTP" }, { status: 400 });
     }

     existingUser.email = existingUser.pendingEmail.value;
     existingUser.pendingEmail = undefined;
     await existingUser.save();

     return NextResponse.json({
        success: true,
        message: "Email updated successfully"
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
