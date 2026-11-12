
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { formatINRAsUSD } from "../../lib/currency";
import { clearCart, loadCart, saveCart } from "@/lib/cart-storage";

type Product = {
  id: string;
  name: string;
  description: string;
  price: number;
  stock: number;
};

type CheckoutForm = {
  customerName: string;
  customerEmail: string;
  phone: string;
  address: string;
};

export default function CartClient({
  products,
  inrToUsdRate,
}: {
  products: Product[];
  inrToUsdRate: number;
}) {
  const [cart, setCart] = useState<Record<string, number>>({});
  const [loaded, setLoaded] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [form, setForm] = useState<CheckoutForm>({
    customerName: "",
    customerEmail: "",
    phone: "",
    address: "",
  });

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

  function increaseQuantity(product: Product) {
    setCart((current) => {
      const quantity = current[product.id] || 0;

      if (quantity >= product.stock) {
        return current;
      }

      return {
        ...current,
        [product.id]: quantity + 1,
      };
    });
  }

  function decreaseQuantity(productId: string) {
    setCart((current) => {
      const quantity = current[productId] || 0;

      if (quantity <= 1) {
        const updated = { ...current };
        delete updated[productId];
        return updated;
      }

      return {
        ...current,
        [productId]: quantity - 1,
      };
    });
  }

  function removeProduct(productId: string) {
    setCart((current) => {
      const updated = { ...current };
      delete updated[productId];
      return updated;
    });
  }

  const cartProducts = products.filter(
    (product) => (cart[product.id] || 0) > 0
  );

  const total = cartProducts.reduce(
    (sum, product) => sum + product.price * cart[product.id],
    0
  );

  const totalItems = Object.values(cart).reduce(
    (sum, quantity) => sum + quantity,
    0
  );

  async function placeOrder(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    setError("");
    setSuccess("");

    if (cartProducts.length === 0) {
      setError("Your cart is empty.");
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...form,
          items: cartProducts.map((product) => ({
            productId: product.id,
            quantity: cart[product.id],
          })),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to place order.");
      }

      setCart({});
      clearCart();

      setShowCheckout(false);

      setSuccess(
        `Order placed successfully! Order ID: ${data.order?.id || data.orderId || "Confirmed"}`
      );

      setForm({
        customerName: "",
        customerEmail: "",
        phone: "",
        address: "",
      });
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (!loaded) {
    return <p style={{ padding: "40px" }}>Loading your cart...</p>;
  }

  return (
    <div
      style={{
        maxWidth: "1100px",
        margin: "0 auto",
        padding: "40px 20px",
        fontFamily: "Arial, sans-serif",
        color: "#111827",
      }}
    >
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "15px",
        }}
      >
        <Link
          href="/"
          style={{
            color: "#2563eb",
            textDecoration: "none",
            fontWeight: "bold",
          }}
        >
          ← Continue Shopping
        </Link>

        <h1 style={{ fontSize: "32px" }}>Shopping Cart 🛒</h1>
      </header>

      <p style={{ color: "#6b7280", marginTop: "10px" }}>
        You have {totalItems} item(s) in your cart.
      </p>

      {success && (
        <div style={successStyle}>
          {success}
        </div>
      )}

      {error && (
        <div style={errorStyle}>
          {error}
        </div>
      )}

      {cartProducts.length === 0 ? (
        <div
          style={{
            background: "white",
            padding: "50px 20px",
            marginTop: "30px",
            textAlign: "center",
            borderRadius: "12px",
            border: "1px solid #e5e7eb",
          }}
        >
          <h2>Your cart is empty</h2>

          <p style={{ color: "#6b7280", margin: "15px 0" }}>
            Add some products before checkout.
          </p>

          <Link
            href="/"
            style={{
              display: "inline-block",
              background: "#2563eb",
              color: "white",
              padding: "12px 24px",
              borderRadius: "8px",
              textDecoration: "none",
            }}
          >
            Start Shopping
          </Link>
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0, 2fr) minmax(260px, 1fr)",
            gap: "25px",
            marginTop: "30px",
          }}
        >
          <div>
            {cartProducts.map((product) => (
              <div
                key={product.id}
                style={{
                  background: "white",
                  padding: "22px",
                  borderRadius: "12px",
                  border: "1px solid #e5e7eb",
                  marginBottom: "15px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: "15px",
                  flexWrap: "wrap",
                }}
              >
                <div>
                  <h3 style={{ fontSize: "20px" }}>
                    {product.name}
                  </h3>

                  <p style={{ color: "#2563eb", marginTop: "8px" }}>
                    {formatINRAsUSD(product.price, inrToUsdRate)} each
                  </p>

                  <button
                    onClick={() => removeProduct(product.id)}
                    style={{
                      border: "none",
                      background: "transparent",
                      color: "#dc2626",
                      cursor: "pointer",
                      marginTop: "10px",
                    }}
                  >
                    Remove
                  </button>
                </div>

                <div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "12px",
                    }}
                  >
                    <button
                      onClick={() => decreaseQuantity(product.id)}
                      style={quantityButtonStyle}
                    >
                      −
                    </button>

                    <span style={{ fontWeight: "bold" }}>
                      {cart[product.id]}
                    </span>

                    <button
                      onClick={() => increaseQuantity(product)}
                      disabled={cart[product.id] >= product.stock}
                      style={quantityButtonStyle}
                    >
                      +
                    </button>
                  </div>

                  <p style={{ fontWeight: "bold", marginTop: "12px" }}>
                    {formatINRAsUSD(product.price * cart[product.id], inrToUsdRate)}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <aside
            style={{
              background: "white",
              padding: "25px",
              borderRadius: "12px",
              border: "1px solid #e5e7eb",
              height: "fit-content",
            }}
          >
            <h2 style={{ fontSize: "22px" }}>Order Summary</h2>

            <div style={summaryRowStyle}>
              <span>Items ({totalItems})</span>
              <span>{formatINRAsUSD(total, inrToUsdRate)}</span>
            </div>

            <div style={summaryRowStyle}>
              <span>Shipping</span>
              <span>Free</span>
            </div>

            <hr style={{ margin: "20px 0" }} />

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: "20px",
                fontWeight: "bold",
              }}
            >
              <span>Total</span>
              <span style={{ color: "#2563eb" }}>
                {formatINRAsUSD(total, inrToUsdRate)}
              </span>
            </div>

            <button
              onClick={() => {
                setError("");
                setShowCheckout(true);
              }}
              style={{
                width: "100%",
                padding: "14px",
                background: "#2563eb",
                color: "white",
                border: "none",
                borderRadius: "8px",
                fontWeight: "bold",
                marginTop: "25px",
                cursor: "pointer",
              }}
            >
              Proceed to Checkout
            </button>
          </aside>
        </div>
      )}

      {showCheckout && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.55)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
            zIndex: 1000,
            overflowY: "auto",
          }}
        >
          <div
            style={{
              background: "white",
              padding: "30px",
              borderRadius: "14px",
              width: "100%",
              maxWidth: "500px",
              margin: "auto",
            }}
          >
            <h2 style={{ fontSize: "26px", marginBottom: "10px" }}>
              Checkout
            </h2>

            <p style={{ color: "#6b7280", marginBottom: "20px" }}>
              Enter your delivery details.
            </p>

            <form onSubmit={placeOrder}>
              <label style={labelStyle}>Full Name</label>
              <input
                required
                type="text"
                value={form.customerName}
                onChange={(e) =>
                  setForm({ ...form, customerName: e.target.value })
                }
                placeholder="Your full name"
                style={inputStyle}
              />

              <label style={labelStyle}>Email Address</label>
              <input
                required
                type="email"
                value={form.customerEmail}
                onChange={(e) =>
                  setForm({ ...form, customerEmail: e.target.value })
                }
                placeholder="your@email.com"
                style={inputStyle}
              />

              <label style={labelStyle}>Phone Number</label>
              <input
                required
                type="tel"
                value={form.phone}
                onChange={(e) =>
                  setForm({ ...form, phone: e.target.value })
                }
                placeholder="03XXXXXXXXX"
                style={inputStyle}
              />

              <label style={labelStyle}>Delivery Address</label>
              <textarea
                required
                value={form.address}
                onChange={(e) =>
                  setForm({ ...form, address: e.target.value })
                }
                placeholder="Complete delivery address"
                rows={4}
                style={{
                  ...inputStyle,
                  resize: "vertical",
                }}
              />

              <div
                style={{
                  background: "#f8fafc",
                  padding: "15px",
                  borderRadius: "8px",
                  marginBottom: "20px",
                  display: "flex",
                  justifyContent: "space-between",
                  fontWeight: "bold",
                }}
              >
                <span>Order Total</span>
                <span style={{ color: "#2563eb" }}>
                  {formatINRAsUSD(total, inrToUsdRate)}
                </span>
              </div>

              <button
                type="submit"
                disabled={submitting}
                style={{
                  width: "100%",
                  padding: "14px",
                  background: submitting ? "#9ca3af" : "#16a34a",
                  color: "white",
                  border: "none",
                  borderRadius: "8px",
                  fontWeight: "bold",
                  cursor: submitting ? "not-allowed" : "pointer",
                }}
              >
                {submitting ? "Placing Order..." : "Place Order"}
              </button>

              <button
                type="button"
                disabled={submitting}
                onClick={() => setShowCheckout(false)}
                style={{
                  width: "100%",
                  padding: "12px",
                  marginTop: "10px",
                  background: "#f3f4f6",
                  border: "none",
                  borderRadius: "8px",
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

const quantityButtonStyle = {
  width: "35px",
  height: "35px",
  border: "1px solid #d1d5db",
  borderRadius: "6px",
  background: "#f9fafb",
  cursor: "pointer",
  fontSize: "20px",
};

const summaryRowStyle = {
  display: "flex",
  justifyContent: "space-between",
  marginTop: "20px",
};

const labelStyle = {
  display: "block",
  fontWeight: "bold" as const,
  marginBottom: "7px",
};

const inputStyle = {
  width: "100%",
  padding: "12px",
  border: "1px solid #d1d5db",
  borderRadius: "8px",
  marginBottom: "18px",
  fontSize: "15px",
  boxSizing: "border-box" as const,
};

const successStyle = {
  background: "#dcfce7",
  color: "#166534",
  padding: "15px",
  borderRadius: "8px",
  marginTop: "20px",
};

const errorStyle = {
  background: "#fee2e2",
  color: "#991b1b",
  padding: "15px",
  borderRadius: "8px",
  marginTop: "20px",
};
