import { getUserId } from "@/helpers/getUserId";
import { isValidObjectId } from "@/helpers/isValidObject";
import { sleep } from "@/helpers/sleep";
import { dbConnect } from "@/lib/dbConnect";
import { CartModel } from "@/models/cart.model";
import mongoose from "mongoose";
import { NextResponse } from "next/server";

const TXN_RETRIES = 3;


export async function PATCH(request, { params }) {
  await dbConnect();
  try {
    const userId = await getUserId(request);
    if (!isValidObjectId(userId)) {
      return NextResponse.json(
        { success: false, message: "Unautheticated - please login" },
        { status: 401 }
      );
    }

    const { itemId } = params;
    if (!itemId || !isValidObjectId(itemId)) {
      return NextResponse.json(
        { success: false, message: "Invalid cart item ID" },
        { status: 400 }
      );
    }

    const raw = await request.json().catch(() => ({}));
    const delta = Number(raw.delta ?? raw.quantity ?? 0);

    if (!Number.isInteger(delta) || delta <= 0) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid decrement amount (delta must be integer >= 1)",
        },
        { status: 400 }
      );
    }

    let lastErr = null;

    for (let attempt = 1; attempt <= TXN_RETRIES; attempt++) {
      const session = await mongoose.startSession();
      try {
        session.startTransaction();

        const cart = await CartModel.findOne({
          userId,
          isActive: true,
          "items._id": itemId,
        }).session(session);

        if (!cart) {
          await session.abortTransaction();
          await session.endSession();
          return NextResponse.json(
            { success: false, message: "Cart item not found" },
            { status: 404 }
          );
        }

        const idx = cart.items.findIndex(
          (it) => String(it._id) === String(itemId)
        );
        if (idx === -1) {
          await session.abortTransaction();
          await session.endSession();
          return NextResponse.json(
            { success: false, message: "Cart item not found" },
            { status: 404 }
          );
        }

        const currentQty = Number(cart.items[idx].quantity || 0);
        const newQty = Math.max(0, currentQty - delta);

        if (newQty <= 0) {
          cart.items = cart.items.filter(
            (it) => String(it._id) !== String(itemId)
          );
        } else {
          cart.items[idx].quantity = newQty;
          cart.items[idx].addedAt = new Date();
        }

        cart.recalculate();
        const saved = await cart.save({ session });

        await session.commitTransaction();
        await session.endSession();

        const message =
          newQty <= 0 ? "Item removed from cart" : "Item quantity decreased";
        return NextResponse.json(
          { success: true, message, cart: saved },
          { status: 200 }
        );
      } catch (error) {
        lastErr = error;
        try {
          await session.abortTransaction();
        } catch (e) {}
        try {
          await session.endSession();
        } catch (e) {}

        const isTransient =
          (error &&
            typeof error.hasErrorLabel === "function" &&
            error.hasErrorLabel("TransientTransactionError")) ||
          (error && error.code === 112);

        if (!isTransient || attempt === TXN_RETRIES) break;

        const delay = 50 * Math.pow(2, attempt - 1); // 50ms, 100ms, 200ms
        console.warn(
          `PATCH /cart/items retry attempt ${attempt + 1} after ${delay}ms due to transient error`
        );
        await sleep(delay);
      }
    }

    console.error("PATCH /cart/items final error:", lastErr);
    return NextResponse.json(
      { success: false, message: "Could not update cart item, try again" },
      { status: 500 }
    );
  } catch (err) {
    console.error("PATCH /cart/items/[itemId] error: ", err);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}
