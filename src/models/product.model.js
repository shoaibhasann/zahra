import mongoose, { Schema } from "mongoose";


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
      unique: true,
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
      enum: {
        values: ["Bangles", "Bracelets"],
        message: "{VALUE} is not supported"
      },
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

    finalPrice: {
      type: Number,
      min: 0
    },

    hsnCode: {
      type: String,
      required: true,
    },

    ratings: {
      type: Number,
      default: 0,
      max: 5
    },

    numberOfReviews: {
      type: Number,
      default: 0
    },

    reviews: [
      {
        type: Schema.Types.ObjectId,
        ref: "Review"
      }
    ],

    images: [
      {
        public_id: {
          type: String,
          required: true
        },

        secure_url: {
          type: String,
          required: true
        }
      },
    ],

    variants: [
      {
        type: Schema.Types.ObjectId,
        ref: "Variant"
      }
    ],

    availableStock: {
      type: Number,
      default: 0,
      index: true
    },
    
    hasStock: {
      type: Boolean,
      default: false,
      index: true
    }
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
