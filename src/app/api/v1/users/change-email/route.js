import { generateOtp } from "@/helpers/generateOtp";
import { getUserId } from "@/helpers/getUserId";
import { dbConnect } from "@/lib/dbConnect";
import { UserModel } from "@/models/user.model";
import { sendOtpEmail } from "@/services/sendOtpEmail";
import { NextResponse } from "next/server";

export async function POST(request){
    await dbConnect();
    try {
        const { email } = await request.json()
        const userId = getUserId(request);

        if(!userId){
          return NextResponse.json({
            success: false,
            message: "Unauthorized, please login first"
          });
        }
 
        const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[A-Za-z]{2,}$/;

        if(!email || !emailRegex.test(email)){
            return NextResponse.json({
                success: false,
                message: "Email is invalid"
            },{ status: 400});
        
        }

        const existingUser = await UserModel.findOne({
            email: email.trim(),
            _id: { $ne: userId },
            isDeleted: false
        }).select("_id");

        if(existingUser){
            return NextResponse.json(
              { success: false, message: "Email already exists" },
              { status: 409 }
            );
        }

        const {
          toStore: { otpHash, expiresAt, createdAt },
          plainOtp,
        } = await generateOtp();

        let result;

        try {
          result = await sendOtpEmail(email, plainOtp);
        } catch (error) {
          console.log("Error: in sending OTP", error);
        }

        if (!result || !result.success) {
          console.error("OTP send failure: ", result?.error || "unknown");
          return NextResponse.json(
            {
              success: false,
              message: "Failed to send OTP, please try again after some time",
            },
            { status: 500 }
          );
        }

        existingUser.pendingEmail = {
          value: email.trim(),
          otpHash,
          expiresAt,
          createdAt,
        };

        await existingUser.save();

         return NextResponse.json(
              {
                success: true,
                message: "Otp sent successfully"
              },
              { status: 200 }
            );


    } catch (err) {
      console.error("POST /users/change-email error: ", err);
         return NextResponse.json(
           {
             success: false,
             message: "Error: while sending otp",
           },
           { status: 500 }
         );
    }
}