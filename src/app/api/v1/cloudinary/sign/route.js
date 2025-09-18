import { getUserRole } from "@/helpers/getUserId";
import { cloudinarySignSchema } from "@/schemas/cloudinarySignSchema";
import { v2 as cloudinary } from "cloudinary";
import { NextResponse } from "next/server";

cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});


export async function POST(request){
    try {
    
        const body = await request.json();

        const { paramsToSign } = body;

        const signature = cloudinary.utils.api_sign_request(paramsToSign, process.env.CLOUDINARY_API_SECRET);

        return NextResponse.json({
            signature,
        }, { status: 200 });

    } catch (err) {
        console.error("sign error: ", err);
        return NextResponse.json({
            success: false,
            message: "Internal server error"
        }, { status: 500 });
    }
}