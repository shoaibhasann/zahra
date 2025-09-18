import { getUserRole } from "@/helpers/getUserId";
import { dbConnect } from "@/lib/dbConnect";
import { ProductModel } from "@/models/product.model";
import { createProductSchema } from "@/schemas/createProductSchema";
import { NextResponse } from "next/server";

export async function POST(request){
    await dbConnect();

    try {

        const role = await getUserRole(request);

        if(role !== "Admin"){
          return NextResponse.json({
            success: false,
            message: "Unauthorized"
          }, { status: 401 });
        }
        
        const body = await request.json();

        const parsed = createProductSchema.safeParse(body);


        if (!parsed.success) {
          console.error("zod create product validaton error: ", parsed.error);
          return NextResponse.json(
            {
              success: false,
              message: "Create product validation failed",
            },
            { status: 400 }
          );
        }

        const newProduct = await ProductModel.create(parsed.data);

        return NextResponse.json({
            success: true,
            product: newProduct
        }, { status: 201 });

    } catch (err) {
      console.error("POST /products/add error: ", err);

      
      if (err?.code === 11000) {
        const key = Object.keys(err.keyValue || {}).join(", ");
        return new Response(
          JSON.stringify({ success: false, message: `Duplicate key: ${key}` }),
          { status: 409, headers: { "Content-Type": "application/json" } }
        );
      }

      return NextResponse.json(
        {
          success: false,
          message: "Internal server error",
        },
        { status: 500 }
      );
    }
}