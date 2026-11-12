import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getInrToUsdRate } from "@/lib/exchange-rate";
import { redirect } from "next/navigation";
import Link from "next/link";
import SelectProductsForm from "./SelectProductsForm";

export default async function SelectProductsPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  if (session.user.role !== "SELLER") {
    redirect("/");
  }

  const seller = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });
  if (seller?.role !== "SELLER") {
    redirect("/");
  }

  const [products, inrToUsdRate] = await Promise.all([
    prisma.product.findMany({
      select: {
        id: true,
        name: true,
        description: true,
        price: true,
        stock: true,
        category: true,
        sellerId: true,
      },
      orderBy: [{ category: "asc" }, { name: "asc" }],
    }),
    getInrToUsdRate(),
  ]);

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <Link
          href="/seller"
          className="text-sm font-semibold text-indigo-600 hover:text-indigo-700"
        >
          &larr; Back to Seller Dashboard
        </Link>
        <header className="my-6">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            Select Products
          </h1>
          <p className="mt-2 text-slate-600">
            Select any products to add them to your seller dashboard. Products already selected by another seller are available too.
          </p>
        </header>
        <SelectProductsForm
          products={products.map((product) => ({
            id: product.id,
            name: product.name,
            description: product.description,
            priceUsd: product.price * inrToUsdRate,
            stock: product.stock,
            category: product.category.replaceAll("_", " "),
            assignedToCurrentSeller: product.sellerId === session.user.id,
          }))}
        />
      </div>
    </main>
  );
}
