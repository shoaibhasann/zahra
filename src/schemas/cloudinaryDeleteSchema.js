import { z } from "zod";

export const cloudinaryDeleteSchema = z
  .object({
    public_id: z.string().trim().min(1).optional(),
    public_ids: z.array(z.string().trim().min(1)).optional(),
    invalidate: z.boolean().optional(),
  })
  .superRefine((val, ctx) => {
    const hasSingle =
      typeof val.public_id === "string" && val.public_id.length > 0;
    const hasArray = Array.isArray(val.public_ids) && val.public_ids.length > 0;
    if (!hasSingle && !hasArray) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Provide public_id or public_ids (non-empty).",
      });
    }
  });
