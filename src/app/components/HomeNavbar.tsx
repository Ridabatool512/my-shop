import { auth } from "@/auth";
import Link from "next/link";
import SignOutButton from "./SignOutButton";

export default async function HomeNavbar() {
  const session = await auth();
  const role = session?.user?.role;

  return (
    <header
      style={{
        background: "rgb(8 13 24 / 82%)",
        padding: "20px 6%",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        flexWrap: "wrap",
        gap: "15px",
        borderBottom: "1px solid rgb(148 163 184 / 16%)",
        backdropFilter: "blur(16px)",
      }}
    >
      <Link
        href="/"
        className="myshop-logo"
        style={{
          color: "#f8fafc",
          textDecoration: "none",
          fontSize: "26px",
          fontWeight: "bold",
          letterSpacing: "-0.04em",
        }}
      >
        <span style={{ position: "relative", zIndex: 2 }}>My</span>
        <span
          className="myshop-logo-shop"
          style={{ position: "relative", zIndex: 2 }}
        >
          Shop
        </span>
      </Link>

      <nav
        aria-label="Main navigation"
        style={{
          display: "flex",
          gap: "16px",
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        <Link href="/" className="myshop-nav-link">
          Home
        </Link>
        <a href="#products" className="myshop-nav-link">
          Products
        </a>

        {role === "ADMIN" || role === "SUPER_ADMIN" ? (
          <Link
            href={role === "ADMIN" ? "/admin" : "/super-admin"}
            className="myshop-nav-link"
          >
            Admin Dashboard
          </Link>
        ) : role === "SELLER" ? (
          <Link href="/seller" className="myshop-nav-link">
            Seller Dashboard
          </Link>
        ) : null}

        {role !== "SELLER" && (
          <Link
            href="/cart"
            className="myshop-nav-link myshop-cart-link"
          >
            View Cart
          </Link>
        )}

        {session?.user ? (
          <SignOutButton
            callbackUrl={
              role === "ADMIN" || role === "SUPER_ADMIN"
                ? "/staff-access"
                : "/"
            }
            className="myshop-nav-link myshop-signout-link"
          />
        ) : (
          <>
            <Link href="/login" className="myshop-nav-link">
              Login
            </Link>
            <Link
              href="/signup"
              style={{
                color: "#ffffff",
                textDecoration: "none",
                fontWeight: "bold",
                background: "#2563eb",
                padding: "10px 16px",
                borderRadius: "8px",
              }}
            >
              Sign Up
            </Link>
          </>
        )}
      </nav>
    </header>
  );
}
