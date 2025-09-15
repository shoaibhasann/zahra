import { escapeRegex } from "@/helpers/escregex";
import { dbConnect } from "@/lib/dbConnect";
import { ProductModel } from "@/models/product.model";
import { productQuerySchema } from "@/schemas/productquerySchema";
import { NextResponse } from "next/server";

export async function GET(request, { params }){
    await dbConnect();

    try {

      const url = new URL(request.url);
      const raw = Object.fromEntries(url.searchParams.entries());

      const parsed = productQuerySchema.safeParse(raw);

      if(!parsed.success){
        console.error("zod query validaton error: ", parsed.error);
        return NextResponse.json({
            success: false,
            message: "Query validation failed"
        }, { status: 400 });
      }

      const { q, priceMin, priceMax, sort, page, limit, category } = parsed.data;

      const pipeline = [
        { $match: { isActive: true, hasStock: true }}
      ];

      if(q){
        const re = new RegExp(escapeRegex(q), "i");
        pipeline.push({
            $match: { $or: [ {$title: re}, {$description: re} ]}
        });
      }

      if(category){
        pipeline.push({
            $match: { $category: category }
        });
      }

      if(priceMin !== undefined || priceMax !== undefined){
        const priceCond = {};
        if(priceMin !== undefined) priceCond.$gte = priceMin;
        if(priceMax !== undefined) priceCond.$lte = priceMax;
        pipeline.push({ $match: { $finalPrice: priceCond }});
      }

      let sortStage = { createdAt: -1, _id: -1 }; // default newest 
      if(sort === "price_asc") sortStage = { finalPrice: 1, _id: -1 };
      else if(sort === "price_desc") sortStage = { finalPrice: -1, _id: -1 };
      else if(sort === "best_selling") sortStage = { soldCount: -1, _id: -1 };
      else if(sort === "newest") sortStage = { createdAt: -1, _id: -1 };

      const skip = (page - 1) * limit;

      pipeline.push({
        $facet: {
            meta: [{ $count: "total" }],
            data: [
                { $sort: sortStage },
                { $skip: skip },
                { $limit: limit },

                {
                    $project: {
                        title: 1,
                        slug: 1,
                        images: 1,
                        category: 1,
                        price: 1,
                        discountPercent: 1,
                        finalPrice: 1,
                        availableStock: 1,
                        hasStock: 1,
                        ratings: 1,
                        numberOfReviews: 1,
                        createdAt: 1
                    }
                }
            ]
        }
      });

      const agg = await ProductModel.aggregate(pipeline).allowDiskUse(true);

      const metaObj = agg[0]?.meta?.[0] || { total: 0 };
      const total = metaObj.total || 0;
      const data = agg[0]?.data || [];

        return NextResponse.json({
            success: true,
            message: "Products fetched successfully",
            meta: { total, page, limit, totalPages: Math.ceil(total/limit)},
            data
        }, { status: 200 });

    } catch (err) {
        console.error("GET /products error: ", err);
        return NextResponse.json({
            success: false,
            message: "Internal server error"
        }, { status: 500 })
    }
}