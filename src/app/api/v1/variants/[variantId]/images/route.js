import { getUserRole } from "@/helpers/getUserId";
import { isValidObjectId } from "@/helpers/isValidObject";
import { dbConnect } from "@/lib/dbConnect";
import { VariantModel } from "@/models/variant.model";
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

    const { variantId } = params;

    if (!isValidObjectId(variantId)) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid variant ID",
        },
        { status: 400 }
      );
    }

    const raw = await request.json().catch(() => ({}));

    let items = [];

    if (Array.isArray(raw.images)) {
      items = raw.images;
    } else if (raw.image && typeof raw.image === "object") {
      items = [raw.image];
    } else if (raw.public_id || raw.secure_url) {
      items = [{ public_id: raw.public_id, secure_url: raw.secure_url }];
    } else {
      return NextResponse.json(
        { success: false, message: "No image payload provided" },
        { status: 400 }
      );
    }

    const validated = items.map((it) => {
      const public_id = it.public_id && String(it.public_id).trim();
      const secure_url = it.secure_url && String(it.secure_url).trim();
      return { public_id, secure_url };
    });

    const invalid = validated.find((i) => !i.public_id || !i.secure_url);

    if (invalid) {
      return NextResponse.json(
        {
          success: false,
          message: "Each image must include public_id and secure_url",
        },
        { status: 400 }
      );
    }

    const variant = await VariantModel.findById(variantId);
    
    if (!variant) {
      return NextResponse.json(
        { success: false, message: "Variant not found" },
        { status: 404 }
      );
    }

    const added = [];
    const skipped = [];

    for (const img of validated) {
      const exists =
        Array.isArray(variant.images) &&
        variant.images.some((x) => x.public_id === img.public_id);
      if (exists) {
        skipped.push(img.public_id);
        continue;
      }
      variant.images.push({
        public_id: img.public_id,
        secure_url: img.secure_url,
      });

      added.push(img);
    }

    if (added.length === 0) {
      return NextResponse.json(
        { success: true, message: "No new images to add", skipped },
        { status: 200 }
      );
    }

    await variant.save();

    return NextResponse.json(
      {
        success: true,
        message: "Variant images added successfully",
        data: { added, skipped },
        variantId,
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("POST /variants/[variantId]/images error: ", err);
    return NextResponse.json(
      { success: false, message: "Internal Server Error" },
      { status: 500 }
    );
  }
}
