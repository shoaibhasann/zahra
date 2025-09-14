import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/dbConnect";
import { UserModel } from "@/models/user.model";
import { getUserId } from "@/helpers/getUserId";


export async function POST(request, { params }) {
  await dbConnect();

  try {
    const userId = getUserId(request);
    if (!userId) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }


    const addressId = params?.addrId || params?.slug;
    if (!addressId) {
      return NextResponse.json(
        { success: false, message: "Address id is required" },
        { status: 400 }
      );
    }

    const userExists = await UserModel.findById(userId);
    if (!userExists) {
      return NextResponse.json(
        { success: false, message: "User not found" },
        { status: 404 }
      );
    }

    const addresses = userExists.addresses || [];
    if (addresses.length === 0) {
      return NextResponse.json(
        { success: false, message: "No addresses found" },
        { status: 400 }
      );
    }


    const addr = userExists.addresses.id(addressId);
    if (!addr) {
      return NextResponse.json(
        { success: false, message: "Address with given ID not found" },
        { status: 404 }
      );
    }

    userExists.addresses.forEach((a) => {
      a.isDefault = String(a._id) === String(addressId);
    });

    await userExists.save();

    return NextResponse.json(
      {
        success: true,
        message: "Address set to default successfully",
        addressId,
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("POST /users/addresses/default/[addrId] error:", err);
    return NextResponse.json(
      { success: false, message: "Error: while setting default address" },
      { status: 500 }
    );
  }
}
