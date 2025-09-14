import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/dbConnect";
import { UserModel } from "@/models/user.model";
import { addressPatchSchema } from "@/schemas/addressSchema";
import { getUserId } from "@/helpers/getUserId";



export async function PATCH(request, { params }) {
  await dbConnect();
  try {
    const userId = getUserId(request);
    if (!userId) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const addressId = await params?.addrId || params?.slug;
    if (!addressId) {
      return NextResponse.json(
        { success: false, message: "Address id is required" },
        { status: 400 }
      );
    }

    const body = await request.json();
    if (!body || Object.keys(body).length === 0) {
      return NextResponse.json(
        { success: false, message: "Address fields are required" },
        { status: 400 }
      );
    }

    // validate partial payload
    const parsed = addressPatchSchema.safeParse(body);
    if (!parsed.success) {
      const errorsArray = parsed.error.errors.map((e) => ({
        field: (e.path && e.path.join(".")) || "",
        message: e.message,
      }));
      
      return NextResponse.json(
        {
          success: false,
          message: "Validation failed",
          errors: errorsArray,
        },
        { status: 400 }
      );
    }

    const updates = parsed.data;

    const user = await UserModel.findById(userId);
    if (!user) {
      return NextResponse.json(
        { success: false, message: "User not found" },
        { status: 404 }
      );
    }

    const idx = user.addresses.findIndex(
      (a) => String(a._id) === String(addressId)
    );

    if (idx === -1) {
      return NextResponse.json(
        { success: false, message: "Address not found" },
        { status: 404 }
      );
    }

    const allowedFields = [
      "label",
      "name",
      "phone",
      "line1",
      "line2",
      "city",
      "state",
      "pincode",
      "country",
      "isDefault",
    ];
    for (const key of Object.keys(updates)) {
      if (!allowedFields.includes(key)) continue;
      user.addresses[idx][key] = updates[key];
    }

 
    if (Object.prototype.hasOwnProperty.call(updates, "isDefault")) {
      if (updates.isDefault === true) {
   
        user.addresses.forEach((a) => {
          a.isDefault = String(a._id) === String(addressId);
        });
      } else {
        
        user.addresses[idx].isDefault = false;
        
        if (
          !user.addresses.some((a) => a.isDefault) &&
          user.addresses.length > 0
        ) {
          
          const other = user.addresses.find((a, i) => i !== idx);
          if (other) other.isDefault = true;
        }
      }
    }

    user.addresses[idx].updatedAt = new Date();

    await user.save();

    return NextResponse.json(
      {
        success: true,
        message: "Address updated successfully",
        address: user.addresses[idx],
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("PATCH /users/addresses/[addrId] error:", err);
    return NextResponse.json(
      { success: false, message: "Error: while updating addresses" },
      { status: 500 }
    );
  }
}


export async function DELETE(request, { params }) {
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

    const user = await UserModel.findById(userId);
    if (!user) {
      return NextResponse.json(
        { success: false, message: "User not found" },
        { status: 404 }
      );
    }
    
    const addresses = user.addresses;

    user.addresses = addresses.filter((addr) => String(addr._id) !== String(addressId));
    await user.save();

    return NextResponse.json(
      { success: true, message: "Address deleted", addresses: user.addresses },
      { status: 200 }
    );
  } catch (err) {
    console.error("DELETE /users/addresses/[addrId] error:", err);
    return NextResponse.json(
      { success: false, message: "Error: while deleting address" },
      { status: 500 }
    );
  }
}
