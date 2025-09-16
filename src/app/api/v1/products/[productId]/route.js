import { isValidObjectId } from "@/helpers/isValidObject";
import { dbConnect } from "@/lib/dbConnect";
import { ProductModel } from "@/models/product.model";
import { VariantModel } from "@/models/variant.model";
import { updateProductSchema } from "@/schemas/updateProductSchema";
import mongoose from "mongoose";
import { NextResponse } from "next/server";



export async function GET(request, { params }){
  await dbConnect();

  try {
    const { productId } = params;

    if(!isValidObjectId(productId)){
      return NextResponse.json({
        success: false,
        message: "Invalid Product ID"
      }, { status: 400 });
    }
    const prodObjectId = new mongoose.Types.ObjectId(String(productId));

    const product = await ProductModel.aggregate([
      { $match: { _id: prodObjectId }},
      { $lookup: {
        from: "variants",
        localField: "_id",
        foreignField: "productId",
        as: "variants"
      }}
    ]);

    console.log(product);

    if(!product){
      return NextResponse.json({
        success: false,
        message: "Product not found"
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: "Product fetched successfully",
      data: product
    });

  } catch (err) {
    console.error("GET /products/[productId] error: ", err);
    return NextResponse.json({
      success: false,
      message: "Internal server error"
    }, { status: 500});
  }
}


export async function PATCH(request, { params }) {
  await dbConnect();

  try {
    const { productId } = params;

    if (!isValidObjectId(productId)) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid Product ID",
        },
        { status: 400 }
      );
    }

    const body = await request.json();

    const parsed = updateProductSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          message: "Zod parsing error",
          errors: parsed.error.issues,
        },
        { status: 400 }
      );
    }

    const updated = await ProductModel.findByIdAndUpdate(
      productId,
      { $set: parsed.data },
      { new: true, runValidators: true }
    );

    if (!updated) {
      return NextResponse.json(
        {
          success: false,
          message: "Product not found",
        },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: "Product updated successfully",
        product: updated,
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("PATCH /products/[productId] error:", err);

    if (err?.code === 11000) {
      const key = Object.keys(err.keyValue || {}).join(", ");
      return NextResponse.json(
        { success: false, message: `Duplicate key: ${key}` },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}


export async function DELETE(request, { params }){
    await dbConnect();

        const { productId } = params;

        if(!isValidObjectId(productId)){
            return NextResponse.json({
                success: false,
                message: "Invalid Product ID"
            }, { status: 400 });
        }
        
        const session = await mongoose.startSession();

        try {
            let deletedProduct;
            await session.withTransaction(async () => {
                deletedProduct = await ProductModel.findByIdAndDelete(productId, { session });

                if(!deletedProduct){
                    return NextResponse.json({
                        success: false,
                        message: "Product not found"
                    }, { status: 400 })
                }

                await VariantModel.deleteMany({ productId }, { session });

            });

            return NextResponse.json({
                success: true,
                message: "Product and all variants deleted successfully"
            }, { status: 200 });

        } catch (err) {
            console.error("DELETE /products/:id error:", err);

            return NextResponse.json(
              {
                success: false,
                message: err.message || "Failed to delete product",
              },
              { status: 500 }
            );
        } finally {
          session.endSession();
        }
}
