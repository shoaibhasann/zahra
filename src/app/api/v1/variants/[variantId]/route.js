import { isValidObjectId } from "@/helpers/isValidObject";
import { dbConnect } from "@/lib/dbConnect";
import { VariantModel } from "@/models/variant.model";
import updateVariantSchema from "@/schemas/updateVariantSchema";
import { NextResponse } from "next/server";

export async function GET(request, { params }) {
  await dbConnect();

  try {
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

    const variant = await VariantModel.findById(variantId)
      .populate({
        path: "productId",
        select: "title slug _id",
      })
      .lean()
      .exec();

    if (!variant) {
      return NextResponse.json(
        {
          success: false,
          message: "Variant not found",
        },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: "Variant fetched successfully",
        data: variant,
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("GET /products/[productId]/[variantId] error: ", err);
    return NextResponse.json(
      {
        success: false,
        message: "Internal server error",
      },
      { status: 500 }
    );
  }
}

export async function PATCH(request, { params }) {
  await dbConnect();

  try {
    
    const { variantId } = params;

    if(!isValidObjectId(variantId)){
        return NextResponse.json({
            success: false,
            message: "Invalid variant ID"
        }, { status: 400});
    }

    




  } catch (err) {
    console.error("PATCH /products/[productId]/[variantId] error: ", err);
    return NextResponse.json(
      {
        success: false,
        message: "Internal server error",
      },
      { status: 500 }
    );
  }
}
