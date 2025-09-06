import mongoose, { Schema } from "mongoose";

const orderItemSchema = new Schema(
  {
    productId: {
      type: Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },

    variantId: {
      type: Schema.Types.ObjectId,
      ref: "Variant",
      required: true,
    },

    title: String,
    color: String,
    size: String,
    quantity: { type: Number, required: true, min: 1 },
    price: { type: Number, required: true },
    sku: String,

  },
  { _id: false }
);

const statusHistorySchema = new Schema(
  {
    status: {
      type: String,
      enum: [
        "pending",
        "confirmed",
        "packed",
        "shipped",
        "out_for_delivery",
        "delivered",
        "cancelled",
        "returned",
        "refunded",
      ],
      required: true,
    },
    note: String,
    updatedBy: { type: Schema.Types.ObjectId, ref: "User" },
    at: { type: Date, default: Date.now },
  },
  { _id: false }
);

const trackingSchema = new Schema(
  {
    carrier: String,
    trackingNumber: String,
    trackingUrl: String,
    shippedAt: Date,
  },
  { _id: false }
);

const couponSchema = new Schema(
  {
    code: String,
    discountAmount: { type: Number, default: 0 },
    discountType: {
      type: String,
      enum: ["flat", "percentage"],
      default: "flat",
    },
  },
  { _id: false }
);

const orderSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    items: { type: [orderItemSchema], required: true },

    pricing: {
      subtotal: { type: Number, required: true },
      discount: { type: Number, default: 0 },
      coupon: couponSchema,
      shipping: { type: Number, default: 0 },
      tax: { type: Number, default: 0 },
      total: { type: Number, required: true },
    },

    shippingAddress: {
      fullName: String,
      phone: String,
      street: String,
      city: String,
      state: String,
      postalCode: String,
      country: { type: String, default: "India" },
    },

    payment: {
      type: Schema.Types.ObjectId,
      ref: "Payment"
    },

    status: {
      type: String,
      enum: [
        "pending",
        "confirmed",
        "packed",
        "shipped",
        "out_for_delivery",
        "delivered",
        "cancelled",
        "returned",
        "refunded",
      ],
      default: "pending",
      index: true,
    },

    statusHistory: { type: [statusHistorySchema], default: [] },

    tracking: trackingSchema,


    cancellation: {
      cancelledBy: { type: Schema.Types.ObjectId, ref: "User" },
      reason: String,
      cancelledAt: Date,
      refundAmount: { type: Number, default: 0 },
    },

    returns: {
      isReturned: { type: Boolean, default: false },
      returnRequestedAt: Date,
      returnReason: String,
      returnRefundAmount: { type: Number, default: 0 },
    },

    notes: String,
    adminNotes: String,
    
    placedAt: { type: Date, default: Date.now },
    deliveredAt: Date,
  },

  { timestamps: true }
);

// recent orders for a user
orderSchema.index({ userId: 1, placedAt: -1 });

// admin dashboard: filter by status + recent
orderSchema.index({ status: 1, placedAt: -1 });

// queries often: by transactionId (lookup by payment gateway)
orderSchema.index({ "payment.transactionId": 1 });

// if you will query by tracking number
orderSchema.index({ "tracking.trackingNumber": 1 });


// export
export const OrderModel =
  mongoose.models.Order || mongoose.model("Order", orderSchema);
