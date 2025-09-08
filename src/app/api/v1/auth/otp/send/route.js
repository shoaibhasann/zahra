import { generateOtp } from "@/helpers/generateOtp";
import { normalizeIndianPhoneNumber } from "@/helpers/validatePhone";
import { sendOtpEmail } from "../../../../../../services/sendOtpEmail";
import { createMessage } from "../../../../../../services/twilio";
import { dbConnect } from "@/lib/dbConnect";
import { UserModel } from "@/models/user.model";


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
      return Response.json(
        { success: false, message: "identifier is required" },
        { status: 400 }
      );
    }

    console.log("identifier", identifier);

    // Normalize identifier
    const normalizedPhone = normalizeIndianPhoneNumber(identifier);
    const isPhone = !!normalizedPhone;

    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[A-Za-z]{2,}$/;
    const isEmail = !isPhone && emailRegex.test(identifier);
    const normalizedEmail = identifier.trim().toLowerCase();

    if (!isPhone && !isEmail) {
      return Response.json(
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

      console.log("channel: ", channel);

    // Find existing user
    const userExists = await UserModel.findOne(query);


    if (userExists) {
      console.log("USER: ", userExists)
      if (
        userExists.lastOtpSentAt &&
        new Date(userExists.lastOtpSentAt).getTime() + 30 * 1000 > Date.now()
      ) {
        return Response.json(
          {
            success: false,
            message: "Please wait before requesting another code",
          },
          { status: 429 }
        );
      }

      // Daily request limit (20 per day)
      if (
        userExists.otpRequestCount &&
        userExists.otpRequestCount >= 20 &&
        isSameDay(new Date(userExists.lastOtpSentAt), today)
      ) {
        return Response.json(
          { success: false, message: "OTP request limit reached for today" },
          { status: 429 }
        );
      }
    }

    const { toStore, plainOtp } = await generateOtp(channel);

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
      await UserModel.create({
        otp: { ...toStore },
        lastOtpSentAt: today,
        otpRequestCount: 1,
        ...query,
      });
    }

    // Send OTP
    let sendResult;
    try {
      if (isPhone) {
        sendResult = await createMessage(normalizedPhone, plainOtp);
      } else {
        sendResult = await sendOtpEmail(normalizedEmail, plainOtp);
      }
    } catch (error) {
      console.log("Error: in sending OTP", error)
    }

    // if (!sendResult || !sendResult.success) {
    //   console.error("OTP send failure: ", sendResult?.error || "unknown");
    //   return Response.json(
    //     { success: false, message: "Failed to send OTP" },
    //     { status: 500 }
    //   );
    // }

    return Response.json(
      { success: true, message: "OTP sent successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error while sending OTP:", error);
    return Response.json(
      { success: false, message: "Internal Server Error" },
      { status: 500 }
    );
  }
}
