import { Suspense } from "react";
import { prisma } from "../../lib/prisma";
import CartClient from "./CartClient";
import { getInrToUsdRate } from "@/lib/exchange-rate";
import { auth } from "@/auth";
import { redirect } from "next/navigation";

async function CartProducts() {
  const [products, inrToUsdRate] = await Promise.all([
    prisma.product.findMany(),
    getInrToUsdRate(),
  ]);

  const serializedProducts = products.map((product) => ({
    ...product,
    price: Number(product.price),
  }));

  return <CartClient products={serializedProducts} inrToUsdRate={inrToUsdRate} />;
}

export default async function CartPage() {
  const session = await auth();

  if (session?.user.role === "SELLER") {
    redirect("/seller");
  }

  return (
    <main style={{ minHeight: "100vh", background: "#f8fafc" }}>
      <Suspense
        fallback={
          <div style={{ padding: "40px" }}>
            Loading cart...
          </div>
        }
      >
        <CartProducts />
      </Suspense>
    </main>
  );
}