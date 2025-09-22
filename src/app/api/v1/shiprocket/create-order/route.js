// app/api/shiprocket/create-order/route.js
import { NextResponse } from "next/server";
import { getShiprocketToken } from "@/lib/shiprocketToken";

async function sendOrder(body, token) {
  return fetch("https://apiv2.shiprocket.in/v1/external/orders/create/adhoc", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });
}

export async function POST(req) {
  try {
    const body = await req.json();

    // optional: create local DB order record here with unique idempotency key
    let token = await getShiprocketToken();
    let res = await sendOrder(body, token);

    if (res.status === 401) {
      // token likely invalid — force refresh and retry once
      // clear token keys (so getShiprocketToken will fetch fresh)
      // We can call upstash.del keys directly or call getShiprocketToken which will refresh.
      token = await getShiprocketToken(); // this will refresh if expired
      res = await sendOrder(body, token);
    }

    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (err) {
    console.error("Create order error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
