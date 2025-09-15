import { z } from "zod";

export const SORT_ENUM = [
  "price_asc",
  "price_desc",
  "best_selling",
  "newest",
  "relevance",
];

export const productQuerySchema = z.object({
  q: z.string().optional().transform(s => (typeof s === "string" ? s.trim() : s)),
  instock: z
    .union([z.string(), z.boolean(), z.number()])
    .optional()
    .transform((v) => {
      if (v === undefined || v === null || v === "") return undefined;
      if (typeof v === "boolean") return v;
      if (typeof v === "number") return v === 1;
      const s = String(v).toLowerCase().trim();
      if (["true", "1", "yes"].includes(s)) return true;
      if (["false", "0", "no"].includes(s)) return false;
      return undefined;
    })
    .refine(v => v === undefined || typeof v === "boolean", {
      message: "instock must be boolean-like (true/false/1/0)",
    }),
  priceMin: z
    .union([z.string(), z.number()])
    .optional()
    .transform((v) => {
      if (v === undefined || v === null || v === "") return undefined;
      const n = Number(v);
      return Number.isFinite(n) ? n : undefined;
    })
    .refine(v => v === undefined || (typeof v === "number" && v >= 0), {
      message: "priceMin must be a non-negative number",
    }),
  priceMax: z
    .union([z.string(), z.number()])
    .optional()
    .transform((v) => {
      if (v === undefined || v === null || v === "") return undefined;
      const n = Number(v);
      return Number.isFinite(n) ? n : undefined;
    })
    .refine(v => v === undefined || (typeof v === "number" && v >= 0), {
      message: "priceMax must be a non-negative number",
    }),
  sort: z
    .string()
    .optional()
    .transform(s => (typeof s === "string" ? s.toLowerCase().trim() : s))
    .refine(v => v === undefined || SORT_ENUM.includes(v), {
      message: `sort must be one of: ${SORT_ENUM.join(", ")}`,
    })
    .default("relevance"),
  page: z
    .union([z.string(), z.number()])
    .optional()
    .transform(v => {
      if (v === undefined || v === null || v === "") return 1;
      const n = parseInt(String(v), 10);
      return Number.isFinite(n) && n > 0 ? n : 1;
    })
    .refine(n => Number.isInteger(n) && n >= 1, { message: "page must be >= 1" })
    .default(1),
  limit: z
    .union([z.string(), z.number()])
    .optional()
    .transform(v => {
      if (v === undefined || v === null || v === "") return 12;
      const n = parseInt(String(v), 10);
      return Number.isFinite(n) && n > 0 ? n : 12;
    })
    .refine(n => Number.isInteger(n) && n >= 1 && n <= 100, {
      message: "limit must be between 1 and 100",
    })
    .default(12),
})
  .refine(d =>
    d.priceMin === undefined ||
    d.priceMax === undefined ||
    d.priceMin <= d.priceMax,
  { message: "priceMin cannot be greater than priceMax", path: ["priceMin", "priceMax"] });






