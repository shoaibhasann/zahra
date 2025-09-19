import { getUserId } from "@/helpers/getUserId";
import { isValidObjectId } from "@/helpers/isValidObject";
import { dbConnect } from "@/lib/dbConnect";
import { CartModel } from "@/models/cart.model";
import { NextResponse } from "next/server";

export async function POST(request){
    await dbConnect();
    try {
        const userId = await getUserId(request);

        if(!isValidObjectId(userId)){
            return NextResponse.json({
                success: false,
                message: "Unautheticated - please login"
            }, { status: 401 });
        }

        const existingCart = await CartModel.findOne({
            userId,
            isActive: true
        });

        if(!existingCart){
            return NextResponse.json({
                success: false,
                message: "Cart not found"
            }, { status: 404 });
        }

        await existingCart.remove();

        return NextResponse.json({
            success: true,
            message: "Cart deleted successfully"
        }, { status: 200 });


    } catch (err) {
        console.error("POST /cart/clear error: ", err);
        return NextResponse.json({
            success: false,
            message: "Internal server error"
        }, { status: 500 });
    }
}