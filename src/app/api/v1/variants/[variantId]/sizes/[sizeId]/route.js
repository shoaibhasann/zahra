import { getUserRole } from "@/helpers/getUserId";
import { isValidObjectId } from "@/helpers/isValidObject";
import { dbConnect } from "@/lib/dbConnect";
import { VariantModel } from "@/models/variant.model";
import { updateSizeSchema } from "@/schemas/updateVariantSchema";
import { NextResponse } from "next/server";

export async function PATCH(request, { params }) {
  await dbConnect();

  try {
    const role = await getUserRole(request);
    if (role !== "Admin") {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const { variantId, sizeId } = params;
    if (!isValidObjectId(sizeId) || !isValidObjectId(variantId)) {
      return NextResponse.json(
        { success: false, message: "Invalid Object ID" },
        { status: 400 }
      );
    }

    const raw = await request.json().catch(() => ({}));

    const parsed = updateSizeSchema.safeParse(raw);

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          message: "Validation error",
          error: parsed.error.issues,
        },
        { status: 400 }
      );
    }

    const updates = parsed.data;

    const existingVariant = await VariantModel.findById(variantId).exec();

    if (!existingVariant) {
      return NextResponse.json(
        { success: false, message: "Variant not found" },
        { status: 404 }
      );
    }

    existingVariant.sizes = Array.isArray(existingVariant.sizes)
      ? existingVariant.sizes
      : [];

    const sizeIndex = existingVariant.sizes.findIndex(
      (s) => String(s._id) === String(sizeId)
    );

    if (sizeIndex === -1) {
      return NextResponse.json(
        { success: false, message: "Size not found" },
        { status: 404 }
      );
    }

    const current = existingVariant.sizes[sizeIndex];

    if (Object.prototype.hasOwnProperty.call(updates, "sku")) {
      const normSku = String(updates.sku).trim().toUpperCase();
      if (!normSku)
        return NextResponse.json(
          { success: false, message: "Invalid SKU" },
          { status: 400 }
        );

      const other = await VariantModel.findOne({
        "sizes.sku": normSku,
        _id: { $ne: existingVariant._id },
      }).lean();
      if (other)
        return NextResponse.json(
          { success: false, message: `SKU already exists: ${normSku}` },
          { status: 409 }
        );

      current.sku = normSku;
    }

    if (Object.prototype.hasOwnProperty.call(updates, "size")) {
      current.size = String(updates.size).trim();
    }

    if (Object.prototype.hasOwnProperty.call(updates, "stock")) {
      const stockNum =
        typeof updates.stock === "number"
          ? updates.stock
          : Number(updates.stock);
      if (!Number.isFinite(stockNum) || stockNum < 0)
        return NextResponse.json(
          { success: false, message: "Invalid stock value" },
          { status: 400 }
        );
      current.stock = stockNum;
    }

    if (Object.prototype.hasOwnProperty.call(updates, "isActive")) {
      current.isActive = Boolean(updates.isActive);
    }

    try {
      await existingVariant.save();
    } catch (err) {
      if (err && err.code === 11000) {
        return NextResponse.json(
          { success: false, message: "SKU conflict (duplicate key)" },
          { status: 409 }
        );
      }
      throw err;
    }

    return NextResponse.json(
      {
        success: true,
        message: "Size updated successfully",
        variant: existingVariant,
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("PATCH /variants/[variantId]/sizes/[sizeId] error: ", err);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}


export async function DELETE(request, { params }) {
  await dbConnect();

  try {
    const role = await getUserRole(request);
    if (role !== "Admin") {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const { variantId, sizeId } = params;
    if (!isValidObjectId(variantId) || !isValidObjectId(sizeId)) {
      return NextResponse.json(
        { success: false, message: "Invalid variant or size ID" },
        { status: 400 }
      );
    }

    const existingVariant = await VariantModel.findById(variantId).exec();
    if (!existingVariant) {
      return NextResponse.json(
        { success: false, message: "Variant not found" },
        { status: 404 }
      );
    }

    existingVariant.sizes = Array.isArray(existingVariant.sizes)
      ? existingVariant.sizes
      : [];
    const sizeIndex = existingVariant.sizes.findIndex(
      (s) => String(s._id) === String(sizeId)
    );
    if (sizeIndex === -1) {
      return NextResponse.json(
        { success: false, message: "Size not found" },
        { status: 404 }
      );
    }

    existingVariant.sizes.splice(sizeIndex, 1);
    await existingVariant.save();

    if (existingVariant.productId) {
      await recomputeProductStock(existingVariant.productId).catch((e) =>
        console.error("recompute after delete:", e)
      );
    }

    return NextResponse.json(
      { success: true, message: "Size deleted successfully" },
      { status: 200 }
    );
  } catch (err) {
    console.error("DELETE /variants/[variantId]/sizes/[sizeId] error: ", err);
    return NextResponse.json(
      { success: false, message: "Internal Server Error" },
      { status: 500 }
    );
  }
}
