This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Admin orders and seller assignments

Buyers and sellers sign in at `/login`; Super Admins and their Admins use the
unlinked `/staff-access` page and must
select the matching account type. Credentials are checked against the user's
bcrypt password hash and selected account category. Admin accounts must have
been created by a Super Admin. Existing seeded Admin accounts without this
creator record cannot use the Admin dashboard; create a managed Admin account
from `/super-admin`. Configure `AUTH_SECRET` in the environment
before deploying; keep it private and use a strong random value.
New users can register as a buyer or seller at `/signup`; administrator roles
cannot be selected during public registration.

In the Admin Orders Panel, select **Assign to Seller** on a pending order,
choose a seller account, and enter the price. The form previews a 20% profit;
the API recalculates and saves that amount along with the seller, order, and
admin in `OrderAssignment`. Assignment creation and the order's transition to
`ASSIGNED` are committed in one transaction. Only users with the `SELLER` role
are accepted, and already-assigned orders cannot be assigned again.

Admins are redirected to `/admin`, sellers to `/seller`, and buyers to `/`.
The Seller Dashboard lists only assignments linked to the signed-in seller.
Sellers can pick pending assignments; the API verifies ownership and changes
only that seller's pending assignment to `COMPLETE`.
The `/admin` workspace provides only Orders and Sellers sections. The
`/super-admin` workspace provides buyer, seller, and managed-admin directories,
admin creation, and order assignment activity. Apply the schema migration with
`npx prisma migrate deploy` before using admin creation.

The homepage catalog is populated by `npx prisma db seed`. The seed includes
sample products in mobile accessories, electronics, kids products, fashion,
TV/Android devices, gaming PCs, and PS5/accessories. Product prices are
indicative PKR estimates, not live market quotes; verify and update them before
using the catalog for actual sales.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
