import { getUserId } from "@/helpers/getUserId";
import { dbConnect } from "@/lib/dbConnect";
import { UserModel } from "@/models/user.model";
import { NextResponse } from "next/server";




export async function GET(request) {
  await dbConnect();

  try {
    const userId = getUserId(request);
  
    if (!userId) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const user = await UserModel.findById(userId).select("-otp -lastOtpSentAt -otpRequestCount");
    if (!user) return NextResponse.json({ success: false, message: "User not found" }, { status: 401 });

    return NextResponse.json({ success: true, user }, { status: 200 });
  } catch (err) {
    console.error("GET /users/me error:", err);
    return NextResponse.json({ success: false, message: "Internal Server Error" }, { status: 500 });
  }
}


export async function PATCH(request) {
  await dbConnect();

  try {
    const body = await request.json();
    const { fullname } = body || {};

    const { user: userId } = await request.user;

    if (
      !fullname ||
      typeof fullname !== "string" ||
      fullname.trim().length === 0
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Please enter your name",
        },
        { status: 400 }
      );
    }

    const trimmed = fullname.trim();
    const user = await UserModel.findByIdAndUpdate(
      userId,
      { $set: { fullname: trimmed } },
      { new: true, runValidators: true }
    ).select("-otp -lastOtpSentAt -otpRequestCount");

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          message: "User not found",
        },
        { status: 401 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: "Profile name updated successfully",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("PATCH /users/me error: ", error);
    return NextResponse.json(
      {
        success: false,
        message: "Internal Server Error",
      },
      { status: 500 }
    );
  }
}
