import mongoose from "mongoose";
import { VariantModel } from "@/models/variant.model";
import { ProductModel } from "@/models/product.model";


export async function recomputeProductStock(productId, opts = {}) {
  const { session } = opts;
  if (!productId) return 0;

  const pid =
    productId instanceof mongoose.Types.ObjectId
      ? productId
      : new mongoose.Types.ObjectId(String(productId));

  const agg = await VariantModel.aggregate(
    [
      { $match: { productId: pid, isActive: true } },
      { $unwind: { path: "$sizes", preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: null,
          total: { $sum: { $ifNull: ["$sizes.stock", 0] } },
        },
      },
    ],
    session ? { session } : {}
  );

  const total =
    agg && agg[0] && typeof agg[0].total === "number" ? agg[0].total : 0;

  await ProductModel.findByIdAndUpdate(
    pid,
    { availableStock: total, hasStock: total > 0 },
    { session, new: true }
  );

  return total;
}
