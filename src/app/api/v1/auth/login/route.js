import { generateOtp } from "@/helpers/generateOtp";
import { normalizeIndianPhoneNumber } from "@/helpers/validatePhone";
import { dbConnect } from "@/lib/dbConnect";
import { UserModel } from "@/models/user.model";
import { sendOtpEmail } from "@/services/sendOtpEmail";
import { createMessage } from "@/services/twilio";
import { NextResponse } from "next/server";


function isSameDay(d1, d2) {
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
}

export async function POST(request) {
  await dbConnect();

  try {
    
    const { identifier } = await request.json();

    if (!identifier) {
      return NextResponse.json(
        { success: false, message: "identifier is required" },
        { status: 400 }
      );
    }

    const normalizedPhone = normalizeIndianPhoneNumber(identifier);
    const isPhone = !!normalizedPhone;

    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[A-Za-z]{2,}$/;
    const isEmail = !isPhone && emailRegex.test(identifier);
    const normalizedEmail = identifier.trim().toLowerCase();

    if (!isPhone && !isEmail) {
      return NextResponse.json(
        {
          success: false,
          message: "Please enter a valid phone number or email",
        },
        { status: 400 }
      );
    }

    const channel = isPhone ? "sms" : "email";
    const today = new Date();
    const query = isPhone
      ? { phone: normalizedPhone }
      : { email: normalizedEmail };

    

    const userExists = await UserModel.findOne(query);


    if (userExists) {
      if (
        userExists.lastOtpSentAt &&
        new Date(userExists.lastOtpSentAt).getTime() + 30 * 1000 > Date.now()
      ) {
        return NextResponse.json(
          {
            success: false,
            message: "Please wait before requesting another code",
          },
          { status: 429 }
        );
      }

      // Rate limiting
      if (
        userExists.otpRequestCount &&
        userExists.otpRequestCount >= 20 &&
        isSameDay(new Date(userExists.lastOtpSentAt), today)
      ) {
        return NextResponse.json(
          { success: false, message: "OTP request limit reached for today" },
          { status: 429 }
        );
      }
    }

    const { toStore, plainOtp } = await generateOtp(channel);
    let newUser;

    if (userExists) {
      userExists.otp = { ...toStore };

      if (isSameDay(new Date(userExists.lastOtpSentAt), today)) {
        userExists.otpRequestCount = (userExists.otpRequestCount || 0) + 1;
      } else {
        userExists.otpRequestCount = 1;
      }

      userExists.lastOtpSentAt = today;
      await userExists.save();
    } else {
       newUser = await UserModel.create({
        otp: { ...toStore },
        lastOtpSentAt: today,
        otpRequestCount: 1,
        ...query,
      });
    }

    let result;
    try {
      if (isPhone) {
        result = await createMessage(normalizedPhone, plainOtp);
      } else {
        result = await sendOtpEmail(normalizedEmail, plainOtp);
      }

    } catch (error) {
      console.log("Error: in sending OTP", error)
    }

    if (!result || !result.success) {
      if(userExists){
        userExists.otp = undefined;
        await userExists.save();
      } else {
        newUser.otp = undefined;
        await newUser.save();
      }

      console.error("OTP send failure: ", result?.error || "unknown");
      return NextResponse.json(
        { success: false, message: "Failed to send OTP, please try again after some time" },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { success: true, message: `OTP sent to ${isPhone ? normalizedPhone : normalizedEmail}` },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error while sending OTP:", error);
    return NextResponse.json(
      { success: false, message: "Internal Server Error" },
      { status: 500 }
    );
  }
}
