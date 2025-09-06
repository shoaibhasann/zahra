// models/Cart.js
import mongoose from "mongoose";
const { Schema } = mongoose;

const cartItemSchema = new Schema(
  {
    productId: {
      type: Schema.Types.ObjectId,
      ref: "Product",
      required: true,
      index: true,
    },

    variantId: {
      type: Schema.Types.ObjectId,
      ref: "Variant",
      required: true,
    },

    sizeId: {
      type: Schema.Types.ObjectId,
      required: true,
    },

    sku: { type: String, required: true },

    title: { type: String },

    image: { type: String },

    priceAt: { type: Number, required: true },

    quantity: { type: Number, required: true, min: 1 },
  },

  { _id: true }
);

const cartSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      index: true,
      required: false,
    },

    guestId: { type: String, index: true, required: false },

    items: [cartItemSchema],

    subtotal: { type: Number, default: 0 },
    shipping: { type: Number, default: 0 },
    discount: { type: Number, default: 0 },
    total: { type: Number, default: 0 },

    currency: { type: String, default: "INR" },

    isActive: { type: Boolean, default: true },

    
    expiresAt: { type: Date, index: true },

  },

  {
    timestamps: true,
  }
);

cartSchema.index({ userId: 1 });
cartSchema.index({ guestId: 1 });


cartSchema.methods.recalculate = function () {
  const subtotal = (this.items || []).reduce(
    (sum, item) => sum + item.priceAt * item.quantity,
    0
  );
  this.subtotal = Math.round(subtotal);
  this.total = Math.max(
    0,
    this.subtotal + (this.shipping || 0) - (this.discount || 0)
  );
  return { subtotal, total };
};


cartSchema.methods.addOrUpdateItem = function (newItem) {

  const existing = this.items.find(
    (item) =>
      String(item.productId) === String(newItem.productId) &&
      String(item.variantId || "") === String(newItem.variantId || "")
  );

  if (existing) {
    existing.qty = Math.max(1, (existing.qty || 0) + (newItem.qty || 1));
    existing.priceAt = newItem.priceAt; 
  } else {
    this.items.push(newItem);
  }
  this.recalculate();
  return this;
};

// helper: remove item
cartSchema.methods.removeItemById = function (itemId) {
  this.items = this.items.filter((i) => String(i._id) !== String(itemId));
  this.recalculate();
  return this;
};

// merge guest cart into user cart: (this = userCart), otherCart = guestCart
cartSchema.methods.mergeFrom = async function (otherCart) {
  if (!otherCart || !otherCart.items) return this;
  for (const it of otherCart.items) {
    // simple merge: add qty to existing matching product+variant
    this.addOrUpdateItem({
      productId: it.productId,
      variantId: it.variantId,
      sku: it.sku,
      title: it.title,
      image: it.image,
      priceAt: it.priceAt,
      qty: it.qty,
      metadata: it.metadata,
    });
  }
  // optionally mark otherCart inactive and save both
  otherCart.isActive = false;
  await otherCart.save();
  this.updatedAt = new Date();
  await this.save();
  return this;
};

export const CartModel =
  mongoose.models.Cart || mongoose.model("Cart", cartSchema);
