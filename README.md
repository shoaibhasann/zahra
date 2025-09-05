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
