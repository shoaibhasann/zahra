import { z } from "zod";


export const sizeItemSchema = z.object({
  size: z
    .string({ required_error: "Size is required" })
    .trim()
    .min(1, "Size cannot be empty"),
  stock: z
    .number({ required_error: "Stock is required" })
    .int("Stock must be integer")
    .nonnegative()
    .min(0, "Stock cannot be negative"),
  sku: z
    .string({ required_error: "SKU is required" })
    .trim()
    .toUpperCase()
    .min(1, "SKU cannot be empty"),
  isActive: z
    .boolean()
    .optional()
    .default(true)
});


export const singleVariantSchema = z.object({
  
  color: z
    .string({ required_error: "Color is required" })
    .min(1, "Color cannot be empty"),
  isActive: z.boolean().optional().default(true),
  images: z
    .array(
      z.object({
        public_id: z.string({ required_error: "public_id required" }),
        secure_url: z.string({ required_error: "secure_url required" }),
      })
    )
    .min(1, "At least one image is required"),
  sizes: z
    .array(sizeItemSchema)
    .min(1, "At least one size is required")
    .refine(
      (arr) => {
        // ensure sku uniqueness within payload
        const skus = arr.map((s) => s.sku);
        return new Set(skus).size === skus.length;
      },
      { message: "Duplicate SKUs in sizes array" }
    ),
});

export const createMultipleVariantsSchema = z.object({
  variants: z
    .array(singleVariantSchema)
    .min(1, "At least one variant is required")
    .refine(
      (variants) => {
        // ensure no duplicate color within payload for same product (optional)
        const colors = variants.map((v) => v.color.toLowerCase());
        return new Set(colors).size === colors.length;
      },
      { message: "Duplicate variant colors in payload" }
    )
    .refine(
      (variants) => {
        // ensure SKUs across all variants are unique in payload
        const allSkus = variants.flatMap((v) => v.sizes.map((s) => s.sku));
        return new Set(allSkus).size === allSkus.length;
      },
      { message: "Duplicate SKUs across variants in payload" }
    ),
});
