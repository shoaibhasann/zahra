import { getUserId } from "@/helpers/getUserId";
import { isValidObjectId } from "@/helpers/isValidObject";
import { sleep } from "@/helpers/sleep";
import { dbConnect } from "@/lib/dbConnect";
import { CartModel } from "@/models/cart.model";
import { addCartItemSchema } from "@/schemas/addCartItemSchema";
import mongoose from "mongoose";
import { NextResponse } from "next/server";

const TXN_RETRIES = 3;

export async function POST(request) {
  await dbConnect();

  try {

    const userId = await getUserId(request);

    if (!isValidObjectId(userId)) {
      return NextResponse.json(
        { success: false, message: "Unautheticated - please login" },
        { status: 401 }
      );
    }

    const raw = await request.json().catch(() => ({}));

    const parsed = addCartItemSchema.safeParse(raw);

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          message: "Validation error",
          error: parsed.error.format(),
        },
        { status: 400 }
      );
    }
    const payload = parsed.data;

    let lastErr = null;

    for (let attempt = 1; attempt <= TXN_RETRIES; attempt++) {
      const session = await mongoose.startSession();
      try {
        session.startTransaction();

        let cart = await CartModel.findOne({ userId, isActive: true }).session(
          session
        );

        if (!cart) {
          cart = new CartModel({ userId, items: [] });
          await cart.save({ session });
        }

        cart.addOrUpdateItem(payload);
        cart.recalculate();

        const savedCart = await cart.save({ session });

        await session.commitTransaction();
        await session.endSession();

        return NextResponse.json(
          { success: true, message: "Added to cart", cart: savedCart },
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

    console.error("POST /cart/items final error:", lastErr);
    return NextResponse.json(
      { success: false, message: "Could not add to cart, try again" },
      { status: 500 }
    );
  } catch (err) {
    console.error("POST /cart/items outer error:", err);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}
