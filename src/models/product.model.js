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

  sku: {
    type: String,
    required: true,
    unique: true,
  },
});

const variantSchema = new Schema({
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
});

const productSchema = new Schema(
  {
    title: {
      type: String,
      required: [true, "Title is required"],
      minlength: [2, "Title must have at least 2 characters"],
      maxlength: [50, "Title cannot exceed 50 characters"],
    },

    slug: {
      type: String,
      required: [true, "Slug is required"],
      unique: true, // SEO friendly, no duplicates
      match: [
        /^[a-z0-9-]+$/,
        "Please enter a valid slug (lowercase, numbers, hyphen only)",
      ],
    },

    description: {
      type: String,
      required: [true, "Description is required"],
      minlength: [10, "Description must be at least 10 characters"],
      maxlength: [250, "Description cannot exceed 250 characters"],
    },

    category: {
      type: String,
      enum: ["Bangles", "Bracelets"],
      required: [true, "Category is required"],
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    price: {
      type: Number,
      required: [true, "Price is required"],
      min: [1, "Price must be at least 1"],
    },

    discountPercent: {
      type: Number,
      default: 0,
      min: 0,
      max: 60,
    },

    hsnCode: {
      type: String,
      required: true,
    },

    images: [
      {
        url: { type: String, required: true },
        alt: { type: String },
      },
    ],

    variants: [variantSchema],
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

productSchema.virtual("finalPrice").get(function () {
  if (!this.discountPercent) return this.price;

  return Math.round(this.price - (this.price * this.discountPercent) / 100);
});

export const ProductModel =
  mongoose.models.Product || mongoose.model("Product", productSchema);
