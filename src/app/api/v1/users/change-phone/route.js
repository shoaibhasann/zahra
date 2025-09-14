import { generateOtp } from "@/helpers/generateOtp";
import { getUserId } from "@/helpers/getUserId";
import { normalizeIndianPhoneNumber } from "@/helpers/validatePhone";
import { dbConnect } from "@/lib/dbConnect";
import { UserModel } from "@/models/user.model";
import { NextResponse } from "next/server";

export async function POST(request) {
  await dbConnect();
  try {
   
    const { phoneNumber } = await request.json();
    const userId = getUserId(request);

    const normalizedPhone = normalizeIndianPhoneNumber(phoneNumber);
    const isPhone = !!normalizedPhone;

    if (!phoneNumber || !isPhone) {
      return NextResponse.json(
        {
          success: false,
          message: "Please enter a valid phone number",
        },
        { status: 400 }
      );
    }

    const existingUser = await UserModel.findById(userId).select(
      "-otp -lastOtpSentAt -otpRequestCount"
    );

    if (!existingUser) {
      return NextResponse.json(
        {
          success: false,
          message: "User not found",
        },
        { status: 401 }
      );
    }

    const existing = await UserModel.findOne({
        phone: normalizedPhone,
        _id: { $ne: userId },
        isDeleted: false
    }).select("_id");

    if(existing){
        return NextResponse.json(
            { success: false, message: "Phone number already in use"},
            { status: 409 }
        )
    }

    const {
      toStore: { otpHash, expiresAt, createdAt },
      plainOtp,
    } = await generateOtp();

    let result;

    try {
        result = await createMessage(normalizedPhone, plainOtp);
    } catch (error) {
        console.log("Error: in sending OTP", error);
    }

        if (!result || !result.success) {
          console.error("OTP send failure: ", result?.error || "unknown");
          return NextResponse.json(
            { success: false, message: "Failed to send OTP, please try again after some time" },
            { status: 500 }
          );
        }

    existingUser.pendingPhone = {
      value: normalizedPhone,
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
    console.error("POST /users/change-phone error: ", err);
    return NextResponse.json(
      {
        success: false,
        message: "Error: while sending otp",
      },
      { status: 500 }
    );
  }
}
