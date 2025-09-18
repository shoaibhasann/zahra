import mongoose from "mongoose";
import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/dbConnect";
import { ProductModel } from "@/models/product.model";
import { VariantModel } from "@/models/variant.model";
import { recomputeProductStock } from "@/lib/recomputeStock";
import { createMultipleVariantsSchema } from "@/schemas/createVariantSchema";
import { isValidObjectId } from "@/helpers/isValidObject";
import { getUserRole } from "@/helpers/getUserId";

export async function POST(request, { params }) {
  await dbConnect();

  const role = await getUserRole(request);

  if (role !== "Admin") {
    return NextResponse.json({
      success: false,
      message: "Unauthorized, page not found",
    });
  }

  const { productId } = params;

  if (!isValidObjectId(productId)) {
    return NextResponse.json(
      { success: false, message: "Invalid productId" },
      { status: 400 }
    );
  }

  try {
    const raw = await request.json().catch(() => ({}));

    const parsed = createMultipleVariantsSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, errors: parsed.error.issues },
        { status: 400 }
      );
    }
    const variantsPayload = parsed.data.variants;

    const product = await ProductModel.findById(productId).select("_id images");
    if (!product) {
      return NextResponse.json(
        { success: false, message: "Product not found" },
        { status: 404 }
      );
    }

    const payloadSkus = variantsPayload.flatMap((v) =>
      (v.sizes || []).map((s) => String(s.sku).trim())
    );

    if (payloadSkus.length === 0) {
      return NextResponse.json(
        { success: false, message: "No SKUs provided in payload" },
        { status: 400 }
      );
    }

    const existingVariantWithSkus = await VariantModel.findOne({
      "sizes.sku": { $in: payloadSkus },
    }).lean();

    if (existingVariantWithSkus) {
      const existingSkus = new Set(
        existingVariantWithSkus.sizes.map((s) => s.sku)
      );

      const conflict = payloadSkus.find((sku) => existingSkus.has(sku));

      return NextResponse.json(
        { success: false, message: `SKU already exists: ${conflict}` },
        { status: 409 }
      );
    }

    const session = await mongoose.startSession();

    let createdVariants = [];

    try {
      await session.withTransaction(
        async () => {
          const docsToInsert = variantsPayload.map((v) => ({
            productId,
            ...v,
          }));

          const insertRes = await VariantModel.insertMany(docsToInsert, {
            session,
          });
          createdVariants = insertRes;

          const firstVariantImage = insertRes[0]?.images?.[0];
          if (
            (!product.images || product.images.length === 0) &&
            firstVariantImage
          ) {
            await ProductModel.findByIdAndUpdate(
              productId,
              { $set: { images: [firstVariantImage] } },
              { session }
            );
          }

          await recomputeProductStock(productId, { session });
        },
        {
          readPreference: "primary",
          readConcern: { level: "local" },
          writeConcern: { w: "majority" },
        }
      );

      return NextResponse.json(
        {
          success: true,
          message:
            "Variants created (transactional) and product stock updated.",
          variants: createdVariants,
        },
        { status: 201 }
      );
    } catch (txnErr) {
      console.error("Transaction failed:", txnErr);

      if (txnErr?.code === 11000) {
        const key = Object.keys(txnErr.keyValue || {}).join(", ");
        return NextResponse.json(
          { success: false, message: `Duplicate key: ${key}` },
          { status: 409 }
        );
      }
      return NextResponse.json(
        { success: false, message: txnErr.message || "Transaction failed" },
        { status: 500 }
      );
    } finally {
      session.endSession();
    }
  } catch (err) {
    console.error("POST create-variants error:", err);
    if (err?.code === 11000) {
      const key = Object.keys(err.keyValue || {}).join(", ");
      return NextResponse.json(
        { success: false, message: `Duplicate key: ${key}` },
        { status: 409 }
      );
    }
    if (err?.issues) {
      return NextResponse.json(
        { success: false, errors: err.issues },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}
