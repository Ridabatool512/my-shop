
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { formatINRAsUSD } from "../../lib/currency";
import { loadCart, saveCart } from "@/lib/cart-storage";

type Product = {
  id: string;
  name: string;
  description: string;
  price: number;
  stock: number;
  imageUrl: string | null;
  category: string;
};

type Props = {
  products: Product[];
  inrToUsdRate: number;
  allowCart?: boolean;
  isAuthenticated: boolean;
};

export default function ProductList({
  products,
  inrToUsdRate,
  allowCart = true,
  isAuthenticated,
}: Props) {
  const router = useRouter();
  const [cart, setCart] = useState<Record<string, number>>({});
  const [loaded, setLoaded] = useState(false);
  const [toast, setToast] = useState("");

  useEffect(() => {
    if (!toast) return;

    const timeout = window.setTimeout(() => setToast(""), 2500);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      try {
        const savedCart = loadCart();
        const productById = new Map(products.map((product) => [product.id, product]));
        const validCart = Object.fromEntries(
          Object.entries(savedCart).filter(([productId, quantity]) => {
            const product = productById.get(productId);
            return product !== undefined && quantity <= product.stock;
          })
        );
        setCart(validCart);
      } catch (error) {
        console.error("Cart loading error:", error);
      } finally {
        setLoaded(true);
      }
    });

    return () => window.cancelAnimationFrame(frame);
  }, [products]);

  useEffect(() => {
    if (loaded) {
      try {
        saveCart(cart);
      } catch (error) {
        console.error("Cart saving error:", error);
      }
    }
  }, [cart, loaded]);

  function addToCart(product: Product) {
    if (!isAuthenticated) {
      router.push("/login?callbackUrl=%2F");
      return;
    }

    if ((cart[product.id] || 0) >= product.stock) return;

    setCart((currentCart) => {
      const quantity = currentCart[product.id] || 0;

      if (quantity >= product.stock) {
        return currentCart;
      }

      return {
        ...currentCart,
        [product.id]: quantity + 1,
      };
    });
    setToast("Added to cart");
  }

  function removeFromCart(productId: string) {
    setCart((currentCart) => {
      const updatedCart = { ...currentCart };
      delete updatedCart[productId];
      return updatedCart;
    });
  }

  const cartCount = Object.values(cart).reduce(
    (total, quantity) => total + quantity,
    0
  );

  const cartTotal = products.reduce(
    (total, product) =>
      total + product.price * (cart[product.id] || 0),
    0
  );
  return (
    <section style={{ padding: "40px 6%", color: "#e2e8f0" }}>
      <div
        aria-live="polite"
        className={`fixed right-5 top-5 z-50 rounded-xl border border-emerald-300/30 bg-slate-900 px-5 py-3 text-sm font-semibold text-emerald-200 shadow-xl transition duration-200 ${
          toast ? "translate-y-0 opacity-100" : "pointer-events-none -translate-y-2 opacity-0"
        }`}
        role="status"
      >
        {toast}
      </div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "15px",
        }}
      >
        <div>
          <p style={{ color: "#7dd3fc", fontWeight: "bold" }}>
            OUR COLLECTION
          </p>

          <h2 style={{ fontSize: "32px", color: "#f8fafc" }}>
            Featured Products
          </h2>
        </div>

        {allowCart && (
          <div
            style={{
              background: "rgb(15 23 42 / 82%)",
              color: "#bae6fd",
              padding: "12px 18px",
              borderRadius: "10px",
              fontWeight: "bold",
              border: "1px solid rgb(148 163 184 / 20%)",
              boxShadow: "0 8px 24px rgb(2 6 23 / 18%)",
            }}
          >
            🛒 Cart: {cartCount} | {formatINRAsUSD(cartTotal, inrToUsdRate)}
          </div>
        )}
      </div>

      {products.length === 0 ? (
        <p>No products found.</p>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))",
            gap: "25px",
            marginTop: "30px",
          }}
        >
          {products.map((product) => {
            const quantity = cart[product.id] || 0;

            return (
              <article
                key={product.id}
                className="flex h-full flex-col rounded-[14px] border border-white/10 bg-slate-900/70 p-[22px] text-slate-100 shadow-[0_12px_30px_rgba(0,0,0,0.22)] backdrop-blur-md transition duration-200 hover:-translate-y-1 hover:border-sky-300/30 hover:shadow-[0_18px_38px_rgba(2,6,23,0.42)]"
              >
                <div
                  role={product.imageUrl ? "img" : undefined}
                  aria-label={product.imageUrl ? product.name : undefined}
                  style={{
                    background: "#17243a",
                    height: "130px",
                    flexShrink: 0,
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    fontSize: "55px",
                    borderRadius: "10px",
                    backgroundImage: product.imageUrl
                      ? `url("${product.imageUrl.replaceAll('"', "%22")}")`
                      : undefined,
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                  }}
                >
                  {product.imageUrl ? "" : "🛍️"}
                </div>

                <h3 className="mt-[18px] line-clamp-2 min-h-[3.5rem] text-xl font-semibold text-slate-100">
                  {product.name}
                </h3>

                <p style={{ color: "#7dd3fc", fontWeight: "bold", fontSize: "13px" }}>
                  {product.category?.replaceAll("_", " ") || "General"}
                </p>

                <p className="line-clamp-3 min-h-[4.5rem] text-slate-300">
                  {product.description}
                </p>

                <h3 className="mt-2 text-[23px] font-bold text-sky-300">
                  {formatINRAsUSD(product.price, inrToUsdRate)}
                </h3>

                <p className="mt-1 text-sm text-slate-400">Stock: {product.stock}</p>

                {allowCart && (
                  <>
                    <button
                      onClick={() => addToCart(product)}
                      disabled={quantity >= product.stock}
                      className="myshop-add-to-cart mt-auto w-full rounded-lg px-4 py-3 font-bold text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:cursor-not-allowed"
                    >
                      {quantity >= product.stock
                        ? "Stock Limit Reached"
                        : "Add to Cart"}
                    </button>

                    <div className="mt-3 min-h-12 text-center">
                      {quantity > 0 && (
                        <>
                          <p style={{ color: "#86efac" }}>
                            Added to cart: {quantity}
                          </p>
                          <button
                            onClick={() => removeFromCart(product.id)}
                            className="bg-transparent text-red-300 hover:text-red-200"
                          >
                            Remove from cart
                          </button>
                        </>
                      )}
                    </div>
                  </>
                )}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
