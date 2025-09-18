import { pick } from "@/helpers/pick";
import { dbConnect } from "@/lib/dbConnect";
import { VariantModel } from "@/models/variant.model";
import { getUserRole } from "@/helpers/getUserId";
import { NextResponse } from "next/server";
import { isValidObjectId } from "@/helpers/isValidObject";
import { sizeItemSchema } from "@/schemas/createVariantSchema";

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

    const { variantId } = params;

    if (!isValidObjectId(variantId)) {
      return NextResponse.json(
        { success: false, message: "Invalid variant ID" },
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

    const raw = await request.json().catch(() => ({}));
    
    const parsed = sizeItemSchema.safeParse(raw);

    if(!parsed.success){
        return NextResponse.json({
            success: false,
            error: parsed.error.format()
        }, { status: 400 });
    }

    const { size, stock, sku, isActive } = parsed.data;

    if (
      size == null ||
      sku == null ||
      stock == null ||
      typeof isActive === "undefined"
    ) {
      return NextResponse.json(
        { success: false, message: "Fields are required" },
        { status: 400 }
      );
    }

  

    existingVariant.sizes = Array.isArray(existingVariant.sizes)
      ? existingVariant.sizes
      : [];

    const sameVariantHasSku = existingVariant.sizes.some((s) => {
      return (
        typeof s.sku === "string" && s.sku.trim().toUpperCase() === sku
      );
    });

    if (sameVariantHasSku) {
      return NextResponse.json(
        {
          success: false,
          message: `SKU already exists in this variant: ${sku}`,
        },
        { status: 409 }
      );
    }

    const otherVariantWithSku = await VariantModel.findOne({
      "sizes.sku": sku,
      _id: { $ne: existingVariant._id },
    }).lean();

    if (otherVariantWithSku) {
      return NextResponse.json(
        { success: false, message: `SKU already exists: ${sku}` },
        { status: 409 }
      );
    }

    existingVariant.sizes.push({
      size: size,
      stock: stock,
      sku: sku,
      isActive: Boolean(isActive),
    });

    try {
      await existingVariant.save();
    } catch (saveErr) {
      if (saveErr && saveErr.code === 11000) {
        return NextResponse.json(
          { success: false, message: "SKU conflict (duplicate key)" },
          { status: 409 }
        );
      }
      throw saveErr;
    }

    return NextResponse.json(
      {
        success: true,
        message: "Size added successfully",
        data: existingVariant.sizes,
      },
      { status: 201 }
    );
  } catch (err) {
    console.error("POST /variants/[variantId]/sizes error:", err);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}
