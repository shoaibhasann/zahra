import { getUserId } from "@/helpers/getUserId";
import { dbConnect } from "@/lib/dbConnect";
import { UserModel } from "@/models/user.model";
import { NextResponse } from "next/server";

export async function GET(request) {
  await dbConnect();
  try {
    const userId = getUserId(request);

    if (!userId) {
      return NextResponse.json(
        { success: false, message: "Unauthorized: user id missing" },
        { status: 401 }
      );
    }

    
    const user = await UserModel.findById(userId);
    if (!user) {
      return NextResponse.json(
        { success: false, message: "User not found" },
        { status: 404 }
      );
    }

    const addresses = user.addresses;

    if(!addresses || addresses.length === 0){
        return NextResponse.json({
            success: false,
            message: "Address not found"

        }, {status: 400});
    }

    return NextResponse.json(
      {
        success: true,
        message: "Addresses fetched successfully",
        addresses,
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("GET /users/addresses/:addrId error:", err);
    return NextResponse.json(
      { success: false, message: "Error: while fetching addresses" },
      { status: 500 }
    );
  }
}