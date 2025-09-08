zahra/
├── prisma/                     # if you ever use Prisma with Mongo (optional)
│   └── schema.prisma
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── (storefront)/       # public-facing pages
│   │   │   ├── page.tsx        # Homepage
│   │   │   ├── products/
│   │   │   │   ├── page.tsx    # PLP (Product Listing Page)
│   │   │   │   └── [slug]/page.tsx   # PDP (Product Details Page)
│   │   │   ├── cart/page.tsx
│   │   │   ├── checkout/page.tsx
│   │   │   └── account/
│   │   │       ├── orders/page.tsx
│   │   │       ├── addresses/page.tsx
│   │   │       └── wishlist/page.tsx
│   │   ├── (admin)/            # admin dashboard
│   │   │   ├── products/page.tsx
│   │   │   ├── orders/page.tsx
│   │   │   └── settings/page.tsx
│   │   ├── api/                # Next.js API routes
│   │   │   ├── products/
│   │   │   │   └── route.ts    # GET/POST products
│   │   │   ├── cart/route.ts
│   │   │   ├── checkout/route.ts
│   │   │   └── razorpay/
│   │   │       └── webhook/route.ts
│   │   └── layout.tsx          # global layout
│   │
│   ├── components/             # reusable React components
│   │   ├── ui/                 # shadcn/ui components
│   │   ├── product/            # PDP specific
│   │   │   ├── VariantSelector.tsx
│   │   │   └── SizeGuide.tsx
│   │   └── layout/             # navbar, footer, header, etc.
│   │
│   ├── lib/                    # utilities & helpers
│   │   ├── db.ts               # MongoDB connection
│   │   ├── config.ts           # brand, shipping rules, constants
│   │   ├── money.ts            # INR formatting helpers
│   │   ├── razorpay.ts         # Razorpay client
│   │   └── validators.ts       # Zod schemas for validation
│   │
│   ├── models/                 # Mongoose models
│   │   ├── Product.ts
│   │   ├── Cart.ts
│   │   ├── Order.ts
│   │   ├── User.ts
│   │   └── Coupon.ts
│   │
│   ├── services/               # business logic
│   │   ├── cartService.ts      # add/update/remove items
│   │   ├── orderService.ts     # create order, update status
│   │   ├── productService.ts   # fetch products, search
│   │   └── couponService.ts    # validate/apply coupons
│   │
│   └── styles/                 # global styles
│       └── globals.css
│
├── public/                     # static files (images, icons, etc.)
│   ├── logo.svg
│   └── favicon.ico
│
├── .env.local                  # secrets (DB, Razorpay keys)
├── next.config.js
├── package.json
├── tailwind.config.ts
└── tsconfig.json



Quick API endpoint list (design)

POST /auth/request-otp → send OTP

POST /auth/verify-otp → verify, create session, set tokens

POST /auth/refresh → rotate refresh, issue access token

POST /auth/logout → revoke session & clear cookie

POST /auth/logout-all → revoke all sessions (for user)

GET /auth/sessions → list active sessions (user) — allows user to revoke specific session

POST /auth/revoke-session → revoke other session by id



9) Put it together — checklist for you to implement now

 Implement send-otp route with rate-limiting + identical response to avoid enumeration.

 Save hashed OTP + expiresAt in user doc. Reset failedOtpAttempts on new OTP.

 Implement verify-otp route with timing-safe compare; on success, create sessionId & push session to user. Set HttpOnly cookie.

 Add middleware to validate session cookie for protected APIs (lookup user + session).

 Add logout route to mark session revoked and clear cookie.

 Add monitoring/logging for OTP attempts.

 Add UI flows: request OTP, submit OTP, handle errors (expired, wrong).

 Optionally: integrate with Auth.js Credentials provider later (if you want built-in callbacks/session flows).






 API routes (high-level) — grouped by resource

All routes under /api/v1/...

Auth

POST /auth/otp/send — send OTP (body: { identifier: phone|email }) — rate-limited.

POST /auth/otp/verify — verify OTP (body: { identifier, otp, sessionId? }) — returns JWT + refresh token.

POST /auth/register — signup (email/password) — returns tokens.

POST /auth/login — login (email/password).

POST /auth/refresh — refresh tokens (body: { refreshToken, sessionId }).

POST /auth/logout — revoke session (auth required).

POST /auth/password/forgot — request password reset.

POST /auth/password/reset — reset password.

Auth notes: send and verify should use rate limiting + cooldown; return minimal info on failures.

Users

GET /users/me — get profile (auth).

PATCH /users/me — update profile (auth).

GET /users/:id — get public profile (public).

GET /users/:id/addresses — list addresses (auth).

POST /users/me/addresses — add address (auth).

PATCH /users/me/addresses/:addrId — update address (auth).

DELETE /users/me/addresses/:addrId — remove address (auth).

POST /users/me/set-default-address/:addrId — set default address (auth).

Products & Categories

GET /products — list with pagination, filters (category, price, q, sort).

GET /products/:slugOrId — product details (populate variants).

GET /categories — list categories.

GET /categories/:id/products — products by category.

Admin:

POST /admin/products — create product.

PATCH /admin/products/:id — update.

DELETE /admin/products/:id — delete.

Variants

GET /variants/:id — get variant details.

Admin create/update/delete under /admin/variants.

Cart

GET /cart — get current user cart (auth).

POST /cart/items — add item ({ productId, variantId, qty }) (auth).

PATCH /cart/items/:itemId — change qty (auth).

DELETE /cart/items/:itemId — remove item (auth).

POST /cart/clear — clear cart (auth).

Notes: use server-side validation, price recheck on checkout.

Wishlist

GET /wishlist — list (auth).

POST /wishlist — add item { productId, variantId? } (auth). Use atomic static Wishlist.atomicAdd(userId, ...).

DELETE /wishlist — remove item { productId, variantId? } (auth) or DELETE /wishlist/:itemId.

GET /wishlist/exists?productId=...&variantId=... — optional quick check.

Orders

GET /orders — list user orders (auth, pagination).

GET /orders/:id — order details (auth, ensure owner or admin).

POST /orders — create order (auth) — idempotency-key required; flow:

Validate cart/pricing on server.

Create Order (status: pending).

Create Payment (pending) if not COD.

Return order + payment client payload (e.g., payment link).

POST /orders/:id/cancel — cancel (auth + business rules).

POST /orders/:id/return — request return.

Admin:

PATCH /admin/orders/:id/status — update status + push statusHistory.

GET /admin/orders — admin order listing & filters.

Payments

POST /payments/create — create payment intent for order (auth) — idempotency-key required.

POST /payments/webhook — provider webhook (public endpoint, validate signature) — update Payment & Order atomically.

GET /payments/:id — get payment (auth/admin).

POST /payments/:id/refund — request refund (admin or automated).

Notes: use signature verification, idempotency, and store provider response.

Reviews

POST /products/:id/reviews — add review (auth) — ensure user bought product (optional).

GET /products/:id/reviews — list reviews with pagination.

DELETE /reviews/:id — user/admin can delete.

Coupons

POST /coupons (admin create)

GET /coupons/validate?code=XXX&orderTotal=123 — validate & compute discount.

Admin

Resource CRUD for products, categories, orders, refunds, users.

GET /admin/analytics/sales — sales reports (protected, limited).



// app/api/auth/otp/verify/route.ts
import { NextResponse } from "next/server";
import { z } from "zod";
import { User } from "@/models/User";
import { formatZodError } from "@/lib/validation";

const VerifySchema = z.object({
  identifier: z.string(),
  otp: z.string().length(6)
});

export async function POST(req) {
  const raw = await req.json().catch(() => ({}));
  const p = VerifySchema.safeParse(raw);
  if (!p.success) return NextResponse.json({ ok: false, error: formatZodError(p.error) }, { status: 422 });

  const { identifier, otp } = p.data;
  const user = await User.findOne({ $or: [{ email: identifier }, { phone: identifier }] });
  if (!user) return NextResponse.json({ ok: false, error: { code: "invalid", message: "Invalid credentials" } }, { status: 401 });

  const res = await user.verifyOtp(otp); // your helper
  if (!res.ok) return NextResponse.json({ ok: false, error: { code: res.reason, message: res.reason } }, { status: 401 });

  // issue tokens and return
  const tokens = await issueTokensForUser(user);
  return NextResponse.json({ ok: true, data: { tokens } });
}


review

Tests for: token issuance, refresh rotation, token reuse, logout, cookie clearing, session persistence.


Product & commerce next steps (since this is e-commerce)

User account & profile:

Addresses UI (CRUD + default), order history page, saved payment methods (PCI rules), wishlist.

Orders & checkout core

Cart, checkout flow, payment gateway integration, order model, order-confirmation emails.

Inventory & product management

Product/variant schemas, stock levels, admin panel to add/edit products.

Payments, taxes, shipping

Integrate payment gateway (Razorpay/Stripe/PayU), shipping rates, tax calculation, order fulfillment flow.

Admin dashboard

Users, orders, refunds/returns, coupons, analytics (sales, conversion).

Testing & release checklist (pre-prod -> prod)

End-to-end tests covering login → checkout → order confirmation.

Load test auth endpoints (OTP, refresh) with realistic traffic patterns.

Run a security review on sensitive endpoints.

Verify email deliverability (seed multiple provider inboxes: Gmail, Yahoo, corporate).

Prepare migration steps for hashed refresh tokens (update existing sessions).

Monitoring & post-launch

Logins/day, OTPs/day, bounce rates, failed deliveries, active sessions per user.

Set up a dashboard and alerts for suspicious patterns (token reuse, many OTPs to single phone).

Quick wins you can do in the next 1–2 hours (pick one)

Hash refresh tokens and update refresh flow to compare hashes.

Add revokedAt + revokeReason to sessions and persist them on logout.

Add unit tests that assert logout revokes session and refresh fails afterwards.

Verify Resend/Twilio setup & send a test email with proper from.

If you want, I can now do any one of these fully:
A) Write the refresh token rotation + reuse detection pseudocode and DB update logic (no runnable code).
B) Draft the atomic logout DB query and the exact cookie headers to clear.
C) Produce a test plan with concrete test cases and Postman/curl examples for auth flows.
D) Design the session management UI data contract + wireframe copy (list item fields, actions).

Which one shall I draft next?