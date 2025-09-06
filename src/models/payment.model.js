// models/Payment.js
import mongoose, { Schema, Types } from "mongoose";

const paymentSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    orderId: {
      type: Schema.Types.ObjectId,
      ref: "Order",
      required: true,
    },

    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, required: true, default: "INR", maxlength: 3 },

    method: {
      type: String,
      enum: [
        "card",
        "upi",
        "netbanking",
        "wallet",
        "cod",
        "bank_transfer",
        "other",
      ],
      required: true,
    },

    transactionId: { type: String, sparse: true },
    providerResponse: { type: Schema.Types.Mixed },
    status: {
      type: String,
      enum: ["pending", "success", "failed", "refunded", "cancelled"],
      default: "pending",
      index: true,
    },

    paidAt: {
        type: Date
    },

    // helpful for idempotency (prevent double charging)
    idempotencyKey: { type: String, sparse: true },

  },
  { timestamps: true }
);


export const PaymentModel =
  mongoose.models.Payment || mongoose.model("Payment", paymentSchema);


