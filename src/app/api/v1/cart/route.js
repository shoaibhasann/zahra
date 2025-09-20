import { getUserId } from "@/helpers/getUserId";
import { isValidObjectId } from "@/helpers/isValidObject";
import { sleep } from "@/helpers/sleep";
import { dbConnect } from "@/lib/dbConnect";
import { CartModel } from "@/models/cart.model";
import { cartSchema } from "@/schemas/addCartItemSchema";
import mongoose from "mongoose";
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

const TXN_RETRIES = 3;

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

        const incomingCart = parsed.data;

        let lastErr = null;

        for(let attempt = 1; attempt <= TXN_RETRIES; attempt++){
            const session = await mongoose.startSession();

            try {
                session.startTransaction();

                const existing = await CartModel.findOne({ userId, isActive: true }).session(session);

                if(existing){
                    existing.isActive = false;
                    await existing.save({ session });
                }

                const toCreate = {
                  userId,
                  items: incomingCart.items || [],
                  subtotal: incomingCart.subtotal || 0,
                  shipping: incomingCart.shipping || 0,
                  discount: incomingCart.discount || 0,
                  total: incomingCart.total || 0,
                  currency: incomingCart.currency || "INR",
                  isActive: true
                };

                const newCart = new CartModel(toCreate);
                await newCart.save({session});


                await session.commitTransaction();
                await session.endSession();

                return NextResponse.json(
                  {
                    success: true,
                    message: "Cart merged/created",
                    cart: newCart,
                  },
                  { status: 201 }
                );

            } catch (error) {
                    lastErr = error;
                    try {
                      await session.abortTransaction();
                    } catch (e) {}
                    await session.endSession();
            
                    const isTransient =
                      (error &&
                        typeof error.hasErrorLabel === "function" &&
                        error.hasErrorLabel("TransientTransactionError")) ||
                      (error && error.code === 112);
            
            
                    if (!isTransient || attempt === TXN_RETRIES) break;
            
                    const delay = 50 * Math.pow(2, attempt - 1);
                    console.warn(
                      `Retrying transaction (attempt ${attempt + 1}) after ${delay}ms`
                    );
                    await sleep(delay);
                  }
        }

        console.error("POST /cart merge final error:", lastErr);
        return NextResponse.json(
          { success: false, message: "Could not merge cart, try again" },
          { status: 500 }
        );


    } catch (err) {
        console.error("POST /cart error: ", err);
        return NextResponse.json({
            success: false,
            message: "Internal server error"
        }, { status: 500 });
    }
}