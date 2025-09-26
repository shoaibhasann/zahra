import { NextResponse } from "next/server";
import { getShiprocketToken } from "@/lib/shiprocketToken";
import axios from "axios";

function safeNum(v) {
  if (v === null || v === undefined) return NaN;
  if (typeof v === "number") return v;
  if (typeof v === "string") {
    const m = v.match(/-?\d+(\.\d+)?/);
    if (m) return Number(m[0]);
  }
  return NaN;
}

function roundUpToNearestTen(num) {
  if (!isFinite(num)) return num;
  return Math.ceil(num / 10) * 10;
}

export async function POST(req) {
  try {
    const payload = await req.json();

    const pickup = String(payload.pickup_pincode || payload.from_pincode || "");
    const delivery = String(
      payload.delivery_pincode || payload.to_pincode || ""
    );
    const weight = Number(payload.weight ?? 0.5);
    const cod = payload.cod === 1 || payload.cod === "1" ? 1 : 0;
    const productValue =
      payload.product_value != null ? Number(payload.product_value) : undefined;

    if (!pickup || !delivery) {
      return NextResponse.json(
        { error: "pickup_pincode and delivery_pincode required" },
        { status: 400 }
      );
    }

    const params = new URLSearchParams({
      pickup_postcode: pickup,
      delivery_postcode: delivery,
      weight: String(weight),
      cod: String(cod),
      ...(productValue ? { declared_value: String(productValue) } : {}),
    });

    let token = await getShiprocketToken();
    const url = `https://apiv2.shiprocket.in/v1/external/courier/serviceability/?${params.toString()}`;


    let axiosResponse;
    try {
      axiosResponse = await axios.get(url, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        
        validateStatus: () => true,
      });
    } catch (err) {
      console.error("axios network error:", err);
      return NextResponse.json(
        { error: "network error contacting shiprocket" },
        { status: 502 }
      );
    }

    if (axiosResponse.status === 401) {
      token = await getShiprocketToken();
      axiosResponse = await axios.get(url, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        validateStatus: () => true,
      });
    }

    const data = axiosResponse.data; 

    const companies =
      data?.data?.available_courier_companies ||
      data?.raw?.data?.available_courier_companies ||
      [];

    if (!Array.isArray(companies) || companies.length === 0) {
      
      return NextResponse.json(
        {
          note: "No courier companies array found in Shiprocket response. Returning raw response.",
          raw: data,
        },
        { status: 200 }
      );
    }

   
    const freightValues = companies
      .map((c) => safeNum(c?.freight_charge))
      .filter((v) => Number.isFinite(v));

    if (freightValues.length === 0) {
      return NextResponse.json(
        {
          note: "No numeric freight_charge values found. Returning raw response.",
          raw: data,
        },
        { status: 200 }
      );
    }

    const sum = freightValues.reduce((a, b) => a + b, 0);
    const avg = sum / freightValues.length;
    const shippingCost = roundUpToNearestTen(avg); 

    const estimatedDelivery =
      companies.find((c) => c?.estimated_delivery_days)
        ?.estimated_delivery_days ||
      companies[0]?.estimated_delivery_days ||
      null;

    return NextResponse.json(
      {
        success: true,
        shippingCost,
        raw_average: avg,
        currency: data?.currency || "INR",
        courier: companies[0]?.courier_name || null,
        estimated_delivery_days: estimatedDelivery,
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("check-shipping error:", err);
    return NextResponse.json(
      { error: err.message || "internal error" },
      { status: 500 }
    );
  }
}