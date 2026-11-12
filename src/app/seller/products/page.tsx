import Link from "next/link";
import { auth } from "@/auth";
import SellerProductsGrid from "@/app/seller/SellerProductsGrid";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";

export default async function SellerProductsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "SELLER") redirect("/");

  const products = await prisma.product.findMany({
    where: { sellerId: session.user.id },
    select: {
      id: true,
      name: true,
      description: true,
      price: true,
      stock: true,
      category: true,
    },
    orderBy: { name: "asc" },
  });

  return (
    <div className="mx-auto max-w-7xl">
      <header className="mb-7 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wider text-indigo-600">
            Seller Catalog
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
            My Products
          </h1>
          <p className="mt-2 text-slate-600">
            Products assigned to your seller account.
          </p>
        </div>
        <Link
          className="inline-flex items-center rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-700"
          href="/seller/select-products"
        >
          Select Products
        </Link>
      </header>
      <SellerProductsGrid products={products} />
    </div>
  );
}
