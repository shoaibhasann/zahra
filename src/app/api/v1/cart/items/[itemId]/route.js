import { getUserId } from "@/helpers/getUserId";
import { isValidObjectId } from "@/helpers/isValidObject";
import { dbConnect } from "@/lib/dbConnect";
import { CartModel } from "@/models/cart.model";
import { addCartItemSchema } from "@/schemas/addCartItemSchema";
import { NextResponse } from "next/server";

export async function PATCH(request, { params }){
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

        const { itemId } = params;

        if(!itemId || !isValidObjectId(itemId)){
            return NextResponse.json({
                success: false,
                message: "Invalid cart item ID"
            }, { status: 400 });
        }

        const existingCart = await CartModel.findOne({
            userId,
            isActive: true,
            "items._id" : itemId
        });

        if(!existingCart){
            return NextResponse.json({
                success: false,
                message: "Cart item not found"
            }, { status: 404 });
        }

        const raw = await request.json().catch(() => ({}));
        const delta = Number(raw.delta ?? raw.quantity ?? 0);

        if(!Number.isInteger(delta) || delta <= 0){
            return NextResponse.json(
              {
                success: false,
                message:
                  "Invalid decrement amount (delta must be integer >= 1)",
              },
              { status: 400 }
            );
        }       

        const itemIndex = existingCart.items.findIndex((it) => String(it._id) === String(itemId));
        const cartItem = existingCart.items[itemIndex];
        const currentQty = Number(cartItem.quantity || 0);
        const newQty = Math.max(0, currentQty - delta);

        if(newQty <= 0){
            existingCart.items = existingCart.items.filter((it) => String(it._id) !== String(itemId));
            existingCart.recalculate();
            const saved = await existingCart.save();

            return NextResponse.json({ success: true, message: "Item removed from cart", cart: saved }, { status: 200 });

        } else {
            existingCart.items[itemIndex].quantity = newQty;
            existingCart.recalculate();
            const saved = await existingCart.save();

            return NextResponse.json(
              {
                success: true,
                message: "Item quantity decreased",
                cart: saved,
              },
              { status: 200 }
            );
        }

    } catch (err) {
        console.error("PATCH /cart/items/[itemId] error: ", err);
        return NextResponse.json({
            success: false,
            message: "Internal server error"
        }, { status: 500 });
    }
}