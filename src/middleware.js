import { NextResponse } from "next/server";
import { jwtVerify } from "jose";

const SECRET = process.env.REFRESH_TOKEN_SECRET;
const secretKey = new TextEncoder().encode(SECRET);

export async function middleware(request) {

  const cookieToken = request.cookies.get("refreshToken")?.value ?? null;

  if (!cookieToken) {
    console.warn("middleware -> no refreshToken cookie, redirecting");
    return NextResponse.redirect(new URL("/login", request.url));
  }

  let token = cookieToken.startsWith("Bearer ")
    ? cookieToken.split(" ")[1]
    : cookieToken;
  token = decodeURIComponent(token);

  try {
    const { payload } = await jwtVerify(token, secretKey);

    const headers = new Headers(request.headers);
    headers.set("x-user-id", String(payload.sub));
    if (payload.role) headers.set("x-user-role", String(payload.role));

    return NextResponse.next({ request: { headers } });
  } catch (err) {
    console.error(
      "middleware -> jwtVerify failed:",
      err?.name,
      err?.message || err
    );
    return NextResponse.redirect(new URL("/login", request.url));
  }
}

export const config = {
  matcher: [
    "/api/v1/:path*",
    "/admin/:path*",
    "/orders/:path*",
    "/payments/:path*",
    "/users/:path*",
  ],
};
