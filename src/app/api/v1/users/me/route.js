import { dbConnect } from "@/lib/dbConnect";
import { UserModel } from "@/models/user.model";
import { NextResponse } from "next/server";

export const dynamic = 'force-static'

export async function GET(request){
    await dbConnect();
    try {
        const { user: userId } = await request.json();

        const userExists = await UserModel.findById(userId).select(
          "-otp -lastOtpSentAt -otpRequestCount"
        );

        if(!userExists){
            return NextResponse.json({
                success: false,
                message: "User not found"
            }, { status: 401 });
        }

        return NextResponse.json({
            success: true,
            message: "User fetched successfully",
            user: userExists
        });
    } catch (error) {
        console.error("Error: in fetching profile", error)
        return NextResponse.json({
            success: false,
            message: "Internal Server Error"
        }, { status: 500 })
    }
}


export async function PATCH(request){
    await dbConnect();

    try {
         const body = await request.json();
         const { fullname } = body || {};

        const { user: userId } = await request.user;
   
        if(!fullname || typeof fullname !== "string" || fullname.trim().length === 0){
            return NextResponse.json({
                success: false,
                message: "Please enter your name"
            }, {status: 400});
        }

        const trimmed = fullname.trim();
        const user = await UserModel.findByIdAndUpdate(
          userId,
          { $set: { fullname: trimmed } },
          { new: true, runValidators: true }
        ).select("-otp -lastOtpSentAt -otpRequestCount");

        if(!user){
            return NextResponse.json({
                success: false,
                message: "User not found"
            }, { status: 401});
        }

        return NextResponse.json({
            success: true,
            message: "Profile name updated successfully"
        }, { status: 200 })

    } catch (error) {
        console.error("Error: in updating profile name", error);
        return NextResponse.json(
          {
            success: false,
            message: "Internal Server Error",
          },
          { status: 500 }
        );
    }
}