
import { Suspense } from "react";
import { auth } from "@/auth";
import { prisma } from "../lib/prisma";
import { getInrToUsdRate } from "../lib/exchange-rate";
import ProductList from "./components/ProductList";
import HomeNavbar from "./components/HomeNavbar";
import BuyerSalePopup from "./components/BuyerSalePopup";

async function ProductsSection({
  allowCart,
  isAuthenticated,
}: {
  allowCart: boolean;
  isAuthenticated: boolean;
}) {
  const [products, inrToUsdRate] = await Promise.all([prisma.product.findMany({
    where: { stock: { gt: 0 } },
    orderBy: {
      createdAt: "desc",
    },
  }), getInrToUsdRate()]);

  return (
    <ProductList
      products={products}
      inrToUsdRate={inrToUsdRate}
      allowCart={allowCart}
      isAuthenticated={isAuthenticated}
    />
  );
}

export default async function Home() {
  const session = await auth();

  return (
    <main
      className="premium-mesh-background"
      style={{
        minHeight: "100vh",
        fontFamily: "Arial, sans-serif",
        color: "#e2e8f0",
      }}
    >
      <Suspense
        fallback={
          <header
            style={{
              background: "rgb(8 13 24 / 92%)",
              padding: "20px 6%",
              borderBottom: "1px solid rgb(148 163 184 / 16%)",
            }}
          >
            Loading navigation...
          </header>
        }
      >
        <HomeNavbar />
      </Suspense>

      {session?.user.role === "BUYER" && <BuyerSalePopup />}

      {/* Hero Section */}
      <section
        style={{
          padding: "70px 6%",
          background:
            "linear-gradient(135deg, rgb(15 23 42 / 96%), rgb(30 64 175 / 88%), rgb(49 46 129 / 92%))",
          color: "white",
        }}
      >
        <div style={{ maxWidth: "700px" }}>
          <p style={{ fontSize: "14px", letterSpacing: "2px" }}>
            WELCOME TO MY SHOP
          </p>

          <h2
            style={{
              fontSize: "42px",
              margin: "15px 0",
            }}
          >
            Discover Amazing Products
          </h2>

          <p
            style={{
              fontSize: "18px",
              lineHeight: "1.7",
            }}
          >
            Find the best products at great prices.
            Shop your favorite electronics and accessories.
          </p>

          <a
            href="#products"
            style={{
              display: "inline-block",
              marginTop: "20px",
              padding: "14px 28px",
              background: "white",
              color: "#2563eb",
              borderRadius: "8px",
              textDecoration: "none",
              fontWeight: "bold",
            }}
          >
            Shop Now
          </a>
        </div>
      </section>

      {/* Products Section */}
      <section id="products">
        <Suspense
          fallback={
            <div style={{ padding: "50px 6%" }}>
              <h2>Loading Products...</h2>
            </div>
          }
        >
          <ProductsSection
            allowCart={session?.user.role !== "SELLER"}
            isAuthenticated={Boolean(session?.user)}
          />
        </Suspense>
      </section>

      <footer className="border-t border-slate-700 bg-slate-950 text-slate-200">
        <div className="mx-auto grid max-w-7xl gap-10 px-6 py-12 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <h2 className="mb-4 text-base font-bold text-white">
              Get to Know Us
            </h2>
            <ul className="space-y-3 text-sm text-slate-300">
              <li><a className="hover:text-white" href="#about">About MyShop</a></li>
              <li><a className="hover:text-white" href="#careers">Careers</a></li>
              <li><a className="hover:text-white" href="#news">News and Updates</a></li>
            </ul>
          </div>
          <div>
            <h2 className="mb-4 text-base font-bold text-white">
              Make Money with Us
            </h2>
            <ul className="space-y-3 text-sm text-slate-300">
              <li><a className="hover:text-white" href="/signup">Sell on MyShop</a></li>
              <li><a className="hover:text-white" href="/signup">Become a Seller</a></li>
              <li><a className="hover:text-white" href="/login">Seller Account</a></li>
            </ul>
          </div>
          <div>
            <h2 className="mb-4 text-base font-bold text-white">
              Payment Products
            </h2>
            <ul className="space-y-3 text-sm text-slate-300">
              <li><a className="hover:text-white" href="#payment-options">Payment Options</a></li>
              <li><a className="hover:text-white" href="#gift-cards">Gift Cards</a></li>
              <li><a className="hover:text-white" href="#offers">Shopping Offers</a></li>
            </ul>
          </div>
          <div>
            <h2 className="mb-4 text-base font-bold text-white">
              Let Us Help You
            </h2>
            <ul className="space-y-3 text-sm text-slate-300">
              <li><a className="hover:text-white" href="/my-orders">Your Orders</a></li>
              <li><a className="hover:text-white" href="#returns">Returns and Refunds</a></li>
              <li><a className="hover:text-white" href="#help">Help Center</a></li>
            </ul>
          </div>
        </div>
        <div className="border-t border-slate-700 px-6 py-6 text-center text-sm text-slate-400">
          © 2026 MyShop. All rights reserved.
        </div>
      </footer>
    </main>
  );
}
