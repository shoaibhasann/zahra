import { getUserId } from "@/helpers/getUserId";
import { dbConnect } from "@/lib/dbConnect";
import { UserModel } from "@/models/user.model";
import { addressSchema } from "@/schemas/addressSchema";
import { NextResponse } from "next/server";

export async function POST(request){
    await dbConnect();
    try {

        const userId = getUserId(request);
        const body = await request.json();
        const result = addressSchema.safeParse(body);

        if(!result.success){
            const errors = result.error.errors.map((err) => ({
                field: err.path.join("."),
                message: err.message
            }));

            return NextResponse.json({
                success: false,
                message: "Address validation failed", 
                errors
            }, { status: 400 });
        }

        const { label, name, phone, line1, line2, city, state, pincode } = result.data;

        const existingUser = await UserModel.findById(userId);

        if(!existingUser){
            return NextResponse.json({
                success: false,
                message: "User not found"
            }, { status: 400 });
        }

        const addresses = existingUser.addresses;

        const address = {
            label,
            name,
            phone,
            line1,
            line2,
            city,
            state,
            pincode,
            isDefault: addresses.length === 0 ? true : false
        };

        existingUser.addresses.push(address);

        await existingUser.save();

        return NextResponse.json({
            success: true,
            message: "Address added successfully"
        }, { status: 200 });


    } catch (err) {
        console.error("POST /users/addresses/add error:", err);
        return NextResponse.json({
            success: false,
            message: "Error: while adding address"
        }, { status: 500 });
    }
}