import { NextResponse } from "next/server";
import { v2 as cloudinary } from "cloudinary";
import { getUserRole } from "@/helpers/getUserId";
import { cloudinaryDeleteSchema } from "@/schemas/cloudinaryDeleteSchema";

cloudinary.v2.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function POST(request) {
  try {

    const role = getUserRole(request);
    if (!role || role !== "Admin") {
      return NextResponse.json(
        { success: false, message: "Unauthorized, page not found" },
        { status: 401 }
      );
    }

    const raw = await request.json().catch(() => ({}));
    const parsed = cloudinaryDeleteSchema.safeParse(raw);

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid request",
          errors: parsed.error.format(),
        },
        { status: 400 }
      );
    }

    const { public_id, public_ids, invalidate = false } = parsed.data;
    
    const ids =
      public_ids && public_ids.length
        ? public_ids
        : public_id
          ? [public_id]
          : [];

    if (!ids.length) {
      return NextResponse.json(
        { success: false, message: "No public_id(s) provided" },
        { status: 400 }
      );
    }

    const results = [];

    for (const id of ids) {
      try {
        const res = await cloudinary.uploader.destroy(id, { invalidate });
        results.push({ public_id: id, result: res });
      } catch (err) {
        console.error("Cloudinary delete error for", id, err);
        results.push({ public_id: id, error: err?.message || String(err) });
      }
    }

    return NextResponse.json({ success: true, results }, { status: 200 });
  } catch (err) {
    console.error("Cloudinary delete route error:", err);
    return NextResponse.json(
      { success: false, message: "Internal Server error" },
      { status: 500 }
    );
  }
}
