import { getUserRole } from "@/helpers/getUserId";
import { isValidObjectId } from "@/helpers/isValidObject";
import { dbConnect } from "@/lib/dbConnect";
import { recomputeProductStock } from "@/lib/recomputeStock";
import { ProductModel } from "@/models/product.model";
import { VariantModel } from "@/models/variant.model";
import { singleVariantSchema } from "@/schemas/createVariantSchema";
import { NextResponse } from "next/server";

export async function POST(request, { params }) {
  await dbConnect();

  try {

    const role = await getUserRole(request);

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

    const product = await ProductModel.findById(productId)
      .select("_id images")
      .exec();

    if (!product) {
      return NextResponse.json(
        { success: false, message: "Product not found" },
        { status: 404 }
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

    
    const normalizedSizes = sizes.map((s) => ({
      ...s,
      sku: typeof s.sku === "string" ? s.sku.trim().toUpperCase() : s.sku,
    }));

   
    const seen = new Set();
    for (const s of normalizedSizes) {
      const sku = s.sku;
      if (!sku) {
        return NextResponse.json(
          { success: false, message: "Each size must have a SKU" },
          { status: 400 }
        );
      }
      if (seen.has(sku)) {
        return NextResponse.json(
          { success: false, message: `Duplicate SKU in payload: ${sku}` },
          { status: 400 }
        );
      }
      seen.add(sku);
    }

    const payloadSkus = Array.from(seen);
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
        (existingVariantWithSkus.sizes || []).map((x) =>
          typeof x.sku === "string" ? x.sku.trim().toUpperCase() : x.sku
        )
      );

      const conflict = payloadSkus.find((sku) => existingSkus.has(sku));
      return NextResponse.json(
        { success: false, message: `SKU already exists: ${conflict}` },
        { status: 409 }
      );
    }


    const createPayload = {
      productId,
      ...variantPayload,
      sizes: normalizedSizes,
    };

    let created;

    try {
      created = await VariantModel.create([createPayload]);
    } catch (createErr) {
  
      if (createErr && createErr.code === 11000) {
        const dupKey = createErr.keyValue || {};
       
        const dupField = Object.keys(dupKey)[0] || "sku";
        return NextResponse.json(
          {
            success: false,
            message: `SKU conflict (duplicate key): ${JSON.stringify(dupKey)}`,
          },
          { status: 409 }
        );
      }
      throw createErr;
    }

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
