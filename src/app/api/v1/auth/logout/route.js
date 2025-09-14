import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import { NextResponse } from "next/server";

const cookieOptionDefaults = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "Strict",
  path: "/",
  maxAge: 0,
};

export async function POST(request){

    try {
        const cookieStore = await cookies();
        const refreshCookie = cookieStore.get("refreshToken");

        if (!refreshCookie?.value) {
            return NextResponse.json({
                success: true,
                message: "logout (no token)"
            }, { status: 200 })
        }

        let payload;

        try {
            payload = jwt.verify(refreshCookie.value, process.env.REFRESH_TOKEN_SECRET)
        } catch (error) {
            return NextResponse.json({
                success: false,
                message: "Invalid or expired token"
            }, { status: 401 });
        }

        cookieStore.set({
          name: "refreshToken",
          value: "",
          ...cookieOptionDefaults,
        });

         return NextResponse.json({
           success: true,
           message: "logged out successfully",
         }, { status: 200 });

    } catch (err) {
        console.error("POST /auth/logout", err);
        return NextResponse.json({
            success: false,
            message: "Internal Server Error"
        }, { status: 500 })
    }
}