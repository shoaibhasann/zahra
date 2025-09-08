import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";


export async function middleware(request) {
  const cookieStore = cookies();
  const token = cookieStore.get("refreshToken")?.value;

  if (!token) {
    return NextResponse.redirect(new URL("/login", request.nextUrl));
  }

  try {
    const payload = jwt.verify(token, TOKEN_SECRET);

    const headers = new Headers(request.headers);
    headers.set("x-user-id", String(payload.sub));
    headers.set("x-user-role", String(payload.role || ""));

    return NextResponse.next({ request: { headers } });
  } catch (err) {
    return NextResponse.redirect(new URL("/login", request.nextUrl));
  }
}

export const config = {
  matcher: ["/admin/:path*", "/orders/:path*", "/payments/:path*"],
};
