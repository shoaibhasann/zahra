import { recomputeProductStock } from "@/lib/recomputeStock";
import mongoose, { Schema } from "mongoose";

const sizeSchema = new Schema({
  size: {
    type: String,
    required: true,
  },

  stock: {
    type: Number,
    default: 0,
    min: 0,
  },

  isActive: {
    type: Boolean,
    default: true,
  },

  sku: {
    type: String,
    required: true,
  },

}, { _id: true });

const variantSchema = new Schema({
  productId: {
    type: Schema.Types.ObjectId,
    ref: "Product",
    required: true,
  },
  
  color: {
    type: String,
    required: true,
  },

  isActive: {
    type: Boolean,
    default: true,
  },

  images: [
    {
      public_id: {
        type: String,
        required: true,
      },

      secure_url: {
        type: String,
        required: true,
      },
    },
  ],

  sizes: [sizeSchema],

}, { timestamps: true}
);


variantSchema.index({ "sizes.sku": 1 }, { unique: true, sparse: true });
variantSchema.index({ productId: 1, color: 1 }, { unique: true });


variantSchema.post("save", function (doc) {
  recomputeProductStock(doc.productId).catch(err => console.error("stock recompute save: ", err));
});

variantSchema.post("remove", function (doc) {
  recomputeProductStock(doc.productId).catch(err => console.error("stock recompute remove: ", err));
});


export const VariantModel =
  mongoose.models.Variant || mongoose.model("Variant", variantSchema);
