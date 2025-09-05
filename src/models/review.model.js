import mongoose, { Schema } from "mongoose";


const reviewSchema = new Schema({
  productId: {
    type: Schema.Types.ObjectId,
    ref: "Product",
    required: true,
    index: true,
  },

  reviewedBy: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true,
  },

  username: {
    type: String,
    required: true,
  },

  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5,
  },

  comment: {
    type: String,
    required: true,
  },

  images: [{ public_id: String, secure_url: String }],

  createdAt: {
    type: Date,
    default: Date.now,
    index: true,
  },

  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

export const ReviewModel =
  mongoose.models.Review || mongoose.model("Review", reviewSchema);

ReviewModel.createIndexes([
  { productId: 1, createdAt: -1 }, // pagination per product
  { productId: 1, rating: -1 }, // filter top-rated
  { reviewedBy: 1 }, // user-based queries
]);
