import { escapeRegex } from "@/helpers/escregex";
import { getUserRole } from "@/helpers/getUserId";
import { isValidObjectId } from "@/helpers/isValidObject";
import { dbConnect } from "@/lib/dbConnect";
import { recomputeProductStock } from "@/lib/recomputeStock";
import { ProductModel } from "@/models/product.model";
import { VariantModel } from "@/models/variant.model";
import { singleVariantSchema } from "@/schemas/createVariantSchema";
import {
  isDuplicateKeyError,
  parseDuplicateKeyError,
} from "@/helpers/mongoError";
import { NextResponse } from "next/server";

export async function POST(request, { params }) {
  await dbConnect();

  try {
    const role = getUserRole(request);

    if (role !== "Admin") {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const { productId } = params;

    if (!isValidObjectId(productId)) {
      return NextResponse.json(
        { success: false, message: "Invalid Product ID" },
        { status: 400 }
      );
    }

    const raw = await request.json().catch(() => ({}));

    const parsed = singleVariantSchema.safeParse(raw);

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

    const variantPayload = parsed.data;

    const sizes = Array.isArray(variantPayload.sizes)
      ? variantPayload.sizes
      : [];

    const payloadSkus = sizes.map((s) => s.sku).filter(Boolean);

    if (payloadSkus.length === 0) {
      return NextResponse.json(
        { success: false, message: "No SKUs provided in payload" },
        { status: 400 }
      );
    }

    const product = await ProductModel.findById(productId)
      .select("_id images")
      .exec();

    if (!product) {
      return NextResponse.json(
        { success: false, message: "Product not found" },
        { status: 404 }
      );
    }

    const created = await VariantModel.create([
      { productId, ...variantPayload },
    ]);

    const newVariant = created[0];

    if (
      (!product.images || product.images.length === 0) &&
      Array.isArray(newVariant.images) &&
      newVariant.images.length > 0
    ) {
      product.images = product.images || [];
      product.images.push(newVariant.images[0]);
      await product.save();
    }

    await recomputeProductStock(productId).catch((e) =>
      console.error("recompute after create:", e)
    );

    return NextResponse.json(
      {
        success: true,
        message: "Variant added successfully",
        variant: newVariant,
      },
      { status: 201 }
    );
  } catch (err) {
    console.error("POST /products/[productId]/create-variant error: ", err);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}
