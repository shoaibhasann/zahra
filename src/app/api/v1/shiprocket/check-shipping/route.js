// app/api/v1/shiprocket/check-shipping/route.js
import { NextResponse } from "next/server";
import { getShiprocketToken } from "@/lib/shiprocketToken";

/**
 * Expects POST (from your frontend) with JSON body:
 * {
 *   "pickup_pincode": "244102",
 *   "delivery_pincode": "283203",
 *   "weight": 0.5,
 *   "cod": 0
 * }
 *
 * This route will call Shiprocket GET /courier/serviceability?pickup_postcode=...&delivery_postcode=...&weight=...&cod=...
 */

export async function POST(req) {
  try {
    const payload = await req.json();

    const pickup = String(payload.pickup_pincode || payload.from_pincode || "");
    const delivery = String(
      payload.delivery_pincode || payload.to_pincode || ""
    );
    const weight = Number(payload.weight ?? 0.5);
    const cod = payload.cod === 1 || payload.cod === "1" ? 1 : 0;

    if (!pickup || !delivery) {
      return NextResponse.json(
        { error: "pickup_pincode and delivery_pincode required" },
        { status: 400 }
      );
    }

    // Build query params — encode to be safe
    const params = new URLSearchParams({
      pickup_postcode: pickup,
      delivery_postcode: delivery,
      weight: String(weight),
      cod: String(cod),
    });

    // get cached token
    let token = await getShiprocketToken();

    // call Shiprocket GET endpoint
    const url = `https://apiv2.shiprocket.in/v1/external/courier/serviceability/?${params.toString()}`;

    let res = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    // If unauthorized, refresh token once and retry
    if (res.status === 401) {
      token = await getShiprocketToken(); // will refresh if expired
      res = await fetch(url, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
    }

    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (err) {
    console.error("check-shipping error:", err);
    return NextResponse.json(
      { error: err.message || "internal error" },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message:
      "Use POST to call this server route with JSON body (it will call Shiprocket GET internally)",
  });
}
