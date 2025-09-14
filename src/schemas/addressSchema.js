import { z } from "zod";

export const addressSchema = z.object({
  label: z.string().max(30).trim().optional(),
  name: z
    .string()
    .min(2)
    .max(50)
    .regex(/^[a-zA-Z\s]+$/)
    .trim(),
  phone: z
    .string()
    .regex(/^[6-9]\d{9}$/)
    .trim(),
  line1: z.string().min(5).max(100).trim(),
  line2: z.string().max(100).trim().optional(),
  city: z.string().min(2).max(50).trim(),
  state: z.string().min(2).max(50).trim(),
  pincode: z
    .string()
    .regex(/^\d{6}$/)
    .trim(),
  country: z.string().trim().default("India"),
  isDefault: z.boolean().default(false),
});

export const addressPatchSchema = addressSchema.partial();