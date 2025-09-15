import { z } from "zod";

export const createProductSchema = z.object({
  title: z
    .string({
      required_error: "Title is required",
    })
    .min(2, "Title must have at least 2 characters")
    .max(50, "Title cannot exceed 50 characters"),

  slug: z
    .string({
      required_error: "Slug is required",
    })
    .regex(
      /^[a-z0-9-]+$/,
      "Slug must be lowercase letters, numbers and hyphens only"
    ),

  description: z
    .string({
      required_error: "Description is required",
    })
    .min(10, "Description must be at least 10 characters")
    .max(250, "Description cannot exceed 250 characters"),

  category: z.enum(["Bangles", "Bracelets"], {
    required_error: "Category is required",
    invalid_type_error: "Invalid category",
  }),

  isActive: z.boolean().optional().default(true),

  price: z
    .number({
      required_error: "Price is required",
      invalid_type_error: "Price must be a number",
    })
    .min(1, "Price must be at least 1"),

  discountPercent: z
    .number()
    .min(0, "Discount cannot be negative")
    .max(60, "Discount cannot exceed 60")
    .optional()
    .default(0),

  hsnCode: z.string({
    required_error: "HSN Code is required",
  }),

  images: z
    .array(
      z.object({
        public_id: z.string({
          required_error: "Image public_id is required",
        }),
        secure_url: z.string({
          required_error: "Image secure_url is required",
        }),
      })
    ).optional(),

  variants: z
    .array(z.string().regex(/^[a-f\d]{24}$/i, "Invalid ObjectId"))
    .optional(),

  availableStock: z.number().min(0).optional().default(0),

  hasStock: z.boolean().optional().default(false),
});
