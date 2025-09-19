import { getUserId } from "@/helpers/getUserId";
import { isValidObjectId } from "@/helpers/isValidObject";
import { dbConnect } from "@/lib/dbConnect";
import { CartModel } from "@/models/cart.model";
import { addCartItemSchema } from "@/schemas/addCartItemSchema";
import { NextResponse } from "next/server";

export async function POST(request) {
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

    const raw = await request.json().catch(() => ({}));

    const parsed = addCartItemSchema.safeParse(raw);

    if(!parsed.success){
        return NextResponse.json({
            success: false,
            message: "Validation error",
            error: parsed.error.format()
        }, { status: 400 });
    }

    const data = parsed.data;

    let cart = await CartModel.findOne({
        userId,
        isActive: true
    });

    if(!cart){
        cart = await CartModel.create({
            userId,
            items: []
        });
    } 
    
    cart.addOrUpdateItem(data);
    const saved = await cart.save();

    return NextResponse.json({
        success: true,
        message: "Added to cart",
        cart: saved
    }, { status: 201 });

  } catch (err) {
    console.error("POST /cart/items error: ", err);
    return NextResponse.json(
      {
        success: false,
        message: "Internal server error",
      },
      { status: 500 }
    );
  }
}


