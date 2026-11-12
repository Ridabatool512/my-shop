import Link from "next/link";
import { auth } from "@/auth";
import SellerProductsGrid from "@/app/seller/SellerProductsGrid";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";

export default async function SellerDashboardPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "SELLER") redirect("/");

  const products = await prisma.product.findMany({
      where: { stock: { gt: 0 } },
      select: {
        id: true,
        name: true,
        description: true,
        price: true,
        stock: true,
        category: true,
        imageUrl: true,
      },
      orderBy: { createdAt: "desc" },
    });

  return (
    <div className="premium-mesh-background -mx-4 -my-6 min-h-[calc(100vh-64px)] px-4 py-8 text-slate-100 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
      <div className="mx-auto max-w-7xl">
      <header className="mb-10 rounded-2xl border border-white/10 bg-slate-900/70 px-6 py-8 shadow-xl backdrop-blur-md sm:px-9">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wider text-sky-300">
            WELCOME TO MY SHOP · SELLER
          </p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Discover Our Products
          </h1>
          <p className="mt-3 max-w-2xl leading-7 text-slate-300">
            Browse the full in-stock catalog. Prices and stock are shown for
            reference; shopping cart actions are unavailable for seller accounts.
          </p>
        </div>
      </header>
      <section aria-labelledby="seller-catalog-heading">
        <div className="mb-5">
          <p className="text-sm font-bold text-sky-300">OUR COLLECTION</p>
          <h2
            className="mt-1 text-2xl font-bold text-white"
            id="seller-catalog-heading"
          >
            Featured Products
          </h2>
        </div>
        <SellerProductsGrid
          dark
          products={products}
        />
      </section>
      <div className="mt-8">
        <Link
          className="text-sm font-semibold text-sky-300 hover:text-white"
          href="/seller/products"
        >
          Manage My Products →
        </Link>
      </div>
      </div>
    </div>
  );
}
