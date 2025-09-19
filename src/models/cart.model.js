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
      required: true,
    },

    guestId: { type: String, index: true, required: false },

    items: [cartItemSchema],

    subtotal: { type: Number, default: 0 },
    shipping: { type: Number, default: 0 },
    discount: { type: Number, default: 0 },
    total: { type: Number, default: 0 },

    currency: { type: String, default: "INR" },

    isActive: { type: Boolean, default: true },

  },

  {
    timestamps: true,
  }
);


// cart.model.js — only methods part shown / updated
cartSchema.methods.recalculate = function () {
  const subtotal = (this.items || []).reduce(
    (sum, item) => sum + (Number(item.priceAt) || 0) * (Number(item.quantity) || 0),
    0
  );
  this.subtotal = Math.round(subtotal);
  this.total = Math.max(
    0,
    this.subtotal + (Number(this.shipping) || 0) - (Number(this.discount) || 0)
  );
  return { subtotal: this.subtotal, total: this.total };
};

cartSchema.methods.addOrUpdateItem = function (newItem) {
  // normalize incoming field names (accept qty or quantity)
  const incomingQty = Number(newItem.quantity ?? newItem.qty ?? 1);
  const itemToAdd = {
    productId: newItem.productId,
    variantId: newItem.variantId,
    sizeId: newItem.sizeId,
    sku: newItem.sku,
    title: newItem.title,
    image: newItem.image,
    priceAt: Number(newItem.priceAt) || 0,
    quantity: Math.max(1, incomingQty),
  };

  const existing = this.items.find(
    (item) =>
      String(item.productId) === String(itemToAdd.productId) &&
      String(item.variantId || "") === String(itemToAdd.variantId || "")
  );

  if (existing) {
    existing.quantity = Math.max(1, (Number(existing.quantity) || 0) + itemToAdd.quantity);
    existing.priceAt = itemToAdd.priceAt;
  } else {
    this.items.push(itemToAdd);
  }

  this.recalculate();
  return this;
};

cartSchema.methods.removeItemById = function (itemId) {
  this.items = (this.items || []).filter((i) => String(i._id) !== String(itemId));
  this.recalculate();
  return this;
};

cartSchema.methods.mergeFrom = async function (otherCart) {
  if (!otherCart || !Array.isArray(otherCart.items)) return this;
  for (const it of otherCart.items) {
    this.addOrUpdateItem({
      productId: it.productId,
      variantId: it.variantId,
      sizeId: it.sizeId,
      sku: it.sku,
      title: it.title,
      image: it.image,
      priceAt: it.priceAt,
      quantity: it.quantity ?? it.qty ?? 1,
      metadata: it.metadata,
    });
  }
  otherCart.isActive = false;
  await otherCart.save();
  this.updatedAt = new Date();
  await this.save();
  return this;
};


export const CartModel =
  mongoose.models.Cart || mongoose.model("Cart", cartSchema);
