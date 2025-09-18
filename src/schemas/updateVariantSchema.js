import { z } from "zod";
import { isValidObjectId } from "@/helpers/isValidObject";

const objectIdString = z
  .string()
  .refine((val) => isValidObjectId(val), { message: "Invalid ObjectId" });

const imageSchema = z.object({
  public_id: z.string().min(1, "public_id required"),
  secure_url: z.string().url("secure_url must be a valid URL"),
});

export const updateSizeSchema = z.object({
  _id: z
    .string()
    .optional()
    .refine((v) => (v ? isValidObjectId(v) : true), {
      message: "Invalid _id in sizes",
    }),
  size: z.string().min(1, "size is required"),
  stock: z.number().int().nonnegative().optional(),
  sku: z.string().min(1, "sku is required"),
  isActive: z
      .boolean()
      .optional()
      .default(true)
});

export const updateVariantSchema = z
  .object({
    productId: objectIdString.optional(),
    color: z.string().min(1).optional(),
    isActive: z.boolean().optional(),
    images: z.array(imageSchema).optional(),
    sizes: z
      .array(updateSizeSchema)
      .optional()
      .refine(
        (arr) => {
          if (!arr) return true;
          const skus = arr.map((s) => s.sku);
          return new Set(skus).size === skus.length;
        },
        { message: "Duplicate sku values found in sizes" }
      ),
  })
  .partial()
  .refine((obj) => Object.keys(obj).length > 0, {
    message: "Request body must contain at least one field to update",
  });

export default updateVariantSchema;
