import { getUserId } from "@/helpers/getUserId";
import { isValidObjectId } from "@/helpers/isValidObject";
import { dbConnect } from "@/lib/dbConnect";
import { CartModel } from "@/models/cart.model";
import { cartSchema } from "@/schemas/addCartItemSchema";
import { NextResponse } from "next/server";

export async function GET(request){
    await dbConnect();
    try {
        const userId = await getUserId(request);

        if (!isValidObjectId(userId)) {
          return NextResponse.json(
            {
              success: false,
              message: "Unautheticated - please login",
            },
            { status: 401 }
          );
        }

        const cart = await CartModel.findOne({
            userId,
            isActive: true
        });

        if(!cart || cart?.items?.length === 0){
            return NextResponse.json({
                success: true,
                message: "Cart is empty",
                cart: null
            }, { status: 200});
        }

        return NextResponse.json({
            success: true,
            message: "Cart fetched successfully",
            cart
        });


    } catch (err) {
        console.error("GET /cart error: ", err);
        return NextResponse.json({
            success: false,
            message: "Internal server error"
        }, { status: 500 });
    }
}

export async function POST(request){
    await dbConnect();
    try {
        const userId = await getUserId(request);

        const raw = await request.json().catch(() => ({}));

        const parsed = cartSchema.safeParse(raw);

        if(!parsed.success){
            return NextResponse.json({
                success: false,
                message: "Validation error",
                error: parsed.error.format()
            });
        }

        const data = parsed.data;

        const existingCart = await CartModel.findOne({
            userId,
            isActive: true
        });

        if(existingCart){
            existingCart.isActive = false,
            await CartModel.findByIdAndDelete(existingCart._id);
        }

        const cart = await CartModel.create(data);

        if(!cart){
            return NextResponse.json({
                success: false,
                message: "Failed to create cart"
            });
        }

        return NextResponse.json({
            success: true,
            message: "Cart created successfully",
            cart
        });

    } catch (err) {
        console.error("POST /cart error: ", err);
        return NextResponse.json({
            success: false,
            message: "Internal server error"
        }, { status: 500 });
    }
}