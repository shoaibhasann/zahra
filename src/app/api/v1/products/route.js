import { dbConnect } from "@/lib/dbConnect";
import { ProductModel } from "@/models/product.model";
import { NextResponse } from "next/server";

export async function GET(request){
    await dbConnect();

    try {

         const { searchParams } = new URL(request.url);
         const queryParam = {
           username: searchParams.get("username"),
         };
         
        const products = await ProductModel.find();


        return NextResponse.json({
            success: true,
            message: "Products fetched successfully"
        }, { status: 200 })
    } catch (err) {
        console.error("GET /products error: ", err);
        return NextResponse.json({
            success: false,
            message: "Internal server error"
        }, { status: 500 })
    }
}