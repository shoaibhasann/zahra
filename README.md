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