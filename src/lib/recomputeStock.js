import { ProductModel } from "@/models/product.model";
import { VariantModel } from "@/models/variant.model";
import mongoose from "mongoose";

export async function recomputeProductStock(productId){
    if(!productId) return 0;

    const pid = mongoose.Types.ObjectId(productId);

    const agg = await VariantModel.aggregate([
        { $match: {productId: pid, isActive: true}},
        { $unwind: "$sizes" },
        { $match: { "sizes.stock" : { $gt: 0 }} },
        { $group: { _id: "$productId", totalStock: { $sum: "$sizes.stock"} } }
    ]);

    const totalStock = (agg[0] && agg[0].totalStock) ? agg[0].totalStock : 0;

    await ProductModel.findByIdAndUpdate(
        productId,
        { $set: { availableStock: totalStock, hasStock: totalStock > 0 }},
        { new: true }
    ).exec();

    return totalStock;
}