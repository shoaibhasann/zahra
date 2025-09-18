import { getUserRole } from "@/helpers/getUserId";
import { isValidObjectId } from "@/helpers/isValidObject";
import { pick } from "@/helpers/pick";
import { dbConnect } from "@/lib/dbConnect";
import { recomputeProductStock } from "@/lib/recomputeStock";
import { VariantModel } from "@/models/variant.model";
import { NextResponse } from "next/server";

export async function GET(request, { params }) {
  await dbConnect();

  try {
    const role = getUserRole(request);

    if(role !== "Admin"){
        return NextResponse.json({
            success: false,
            message: "Unauthorized, Page not found"
        }, { status: 401 })
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
    console.error("GET /variants/[variantId] error: ", err);
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

    const role = getUserRole(request);

    if(role !== "Admin"){
        return NextResponse.json({
            success: false,
            message: "Unauthorized, page not found"
        }, { status: 401 });
    }
    
    const { variantId } = params;

    if(!isValidObjectId(variantId)){
        return NextResponse.json({
            success: false,
            message: "Invalid variant ID"
        }, { status: 400});
    }

    const body = await request.json();

    const allowed = pick(body, ["color", "isActive"]);

    if(Object.keys(allowed).length === 0){
        return NextResponse.json({
            success: false,
            message: "No updatable fields"
        })
    }

    const updated = await VariantModel.findByIdAndUpdate(
        variantId,
        { $set: allowed },
        { new: true, runValidators: true }
    );

    if(!updated){
        return NextResponse.json({
            success: false,
            message: "Variant not found failed to update"
        }, { status: 400 });
    }

    await recomputeProductStock(updated.productId);

    return NextResponse.json({
        success: true,
        message: "Variant updated successfully",
        data: updated
    }, { status: 200 });

  } catch (err) {
    console.error("PATCH /variants/[variantId] error: ", err);
    return NextResponse.json(
      {
        success: false,
        message: "Internal server error",
      },
      { status: 500 }
    );
  }
}


export async function DELETE(request, { params }) {
  await dbConnect();

  try {
    const role = getUserRole(request);
    
    if(role !== "Admin"){
      return NextResponse.json({
        success: false,
        message: "Unauthorized, page not found"
      }, { status: 401 });
    }

    const { variantId } = params;
    if (!isValidObjectId(variantId)) {
      return NextResponse.json(
        { success: false, message: "Invalid variant ID" },
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

    await variant.deleteOne();

    await recomputeProductStock(variant.productId).catch((e) =>
      console.error("recompute:", e)
    );

    return NextResponse.json(
      { success: true, message: "Variant deleted successfully" },
      { status: 200 }
    );
  } catch (err) {
    console.error("DELETE /variants/[variantId] error: ", err);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}
