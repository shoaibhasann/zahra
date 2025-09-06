import mongoose, { Schema } from 'mongoose';


const wishlistSchema = new Schema({
    userId: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true,
        unique: true
    },

    items: [
        {
            productId: {
                type: Schema.Types.ObjectId,
                ref: "Product",
                required: true
            },

            variantId: {
                type: Schema.Types.ObjectId,
                ref: "Variant",
                required: true
            },
        }
    ]
});

wishlistSchema.methods.addItem = async function(productId, variantId){
    const exists = this.items.find((item) => (String(item.productId) === productId && String(item.variantId) === variantId));

    if(exists) return this;

    this.items.unshift({ productId, variantId});

    if(this.items.length > 100) this.items = this.items.slice(0,100);

    return this.save();
}

wishlistSchema.methods.removeItem = async function(productId, variantId){
    this.items = this.items.filter((item) => (String(item.productId) !== productId && String(item.variantId) !== variantId));

    return this.save();
}


wishlistSchema.methods.isPresent = async function(productId, variantId){
     const exists = this.items.find(
       (item) =>
         String(item.productId) === productId &&
         String(item.variantId) === variantId
     );

    return exists;
}


export const WishlistModel = mongoose.models.Wishlist || mongoose.model("Wishlist", wishlistSchema);

