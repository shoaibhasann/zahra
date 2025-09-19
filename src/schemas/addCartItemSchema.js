import { z } from "zod";

// Regex for validating MongoDB ObjectId (24 hex chars)
const objectId = z
  .string()
  .regex(/^[0-9a-fA-F]{24}$/, "Invalid ObjectId format");

export const addCartItemSchema = z.object({
  productId: objectId,
  variantId: objectId,
  sizeId: objectId,

  sku: z
    .string({
      required_error: "SKU is required",
    })
    .min(1, "SKU cannot be empty"),

  title: z.string().optional(),
  image: z.string().url("Invalid image URL").optional(),

  priceAt: z
    .number({
      required_error: "Price is required",
      invalid_type_error: "Price must be a number",
    })
    .nonnegative(),

  quantity: z
    .number({
      required_error: "Quantity is required",
      invalid_type_error: "Quantity must be a number",
    })
    .int("Quantity must be an integer")
    .min(1, "Quantity must be at least 1"),
});

export const cartSchema = z
  .object({
    userId: objectId,
    items: z
      .array(addCartItemSchema)
      .nonempty("Cart must have at least one item")
      .optional(),
    subtotal: z
      .number({
        required_error: "subtotal is required",
        invalid_type_error: "subtotal must be a number",
      })
      .nonnegative(),
    shipping: z
      .number({
        invalid_type_error: "shipping must be a number",
      })
      .nonnegative()
      .default(0),
    discount: z
      .number({
        invalid_type_error: "discount must be a number",
      })
      .nonnegative()
      .default(0),
    total: z
      .number({
        required_error: "total is required",
        invalid_type_error: "total must be a number",
      })
      .nonnegative(),
    currency: z.string().optional().default("INR"),
  })
  .superRefine((data, ctx) => {
    // expected total formula: subtotal + shipping - discount, clamped to >= 0
    const expected = Math.max(
      0,
      Math.round(
        (data.subtotal || 0) + (data.shipping || 0) - (data.discount || 0)
      )
    );
   
    if (data.total !== expected) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Total mismatch — expected subtotal + shipping - discount (clamped >= 0). Expected ${expected}, got ${data.total}`,
      });
    }
  });
