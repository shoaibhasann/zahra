import { z } from "zod";

export const updateProductSchema = z
  .object({
    title: z
      .string()
      .min(2, "Title must have at least 2 characters")
      .max(50, "Title cannot exceed 50 characters")
      .optional(),

    slug: z
      .string()
      .regex(
        /^[a-z0-9-]+$/,
        "Slug must be lowercase letters, numbers and hyphens only"
      )
      .optional(),

    description: z
      .string()
      .min(10, "Description must be at least 10 characters")
      .max(250, "Description cannot exceed 250 characters")
      .optional(),

    category: z.enum(["Bangles", "Bracelets"]).optional(),

    isActive: z.boolean().optional(),

    price: z
      .number({ invalid_type_error: "Price must be a number" })
      .min(1, "Price must be at least 1")
      .optional(),

    discountPercent: z
      .number()
      .min(0, "Discount cannot be negative")
      .max(60, "Discount cannot exceed 60")
      .optional(),

    hsnCode: z.string().optional(),

    images: z
      .array(
        z.object({
          public_id: z.string(),
          secure_url: z.string(),
        })
      )
      .optional(),

    variants: z
      .array(z.string().regex(/^[a-f\d]{24}$/i, "Invalid ObjectId"))
      .optional(),

    availableStock: z.number().int().min(0).optional(),

    hasStock: z.boolean().optional(),
  })
  .refine(
    (data) => {
      return true;
    },
    { message: "Invalid product update payload" }
  );
