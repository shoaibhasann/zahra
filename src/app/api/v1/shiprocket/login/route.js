import { NextResponse } from "next/server";

export async function GET(request) {
  try {
    
    const raw = JSON.stringify({
      email: process.env.SHIPROCKET_EMAIL,
      password: process.env.SHIPROCKET_PASSWORD,
    });

    const myHeaders = new Headers();
    myHeaders.append("Content-Type", "application/json");

    const requestOptions = {
      method: "POST",
      headers: myHeaders,
      body: raw,
      redirect: "follow",
    };

    const response = await fetch(
      "https://apiv2.shiprocket.in/v1/external/auth/login",
      requestOptions
    );

    const result = await response.json();

    return NextResponse.json({
      success: true,
      result,
    });
  } catch (error) {
    console.log(error);
  }
}
