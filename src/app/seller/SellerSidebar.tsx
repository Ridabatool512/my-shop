"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { label: "Dashboard", href: "/seller" },
  { label: "My Products", href: "/seller/products" },
  { label: "Orders", href: "/seller/orders" },
  { label: "Customer Support", href: "/seller/customer-support" },
  { label: "Wallet", href: "/seller/wallet" },
];

export default function SellerSidebar() {
  const pathname = usePathname();

  function renderLinks(mobile = false) {
    return links.map(({ label, href }) => {
      const active =
        href === "/seller"
          ? pathname === href
          : pathname === href || pathname.startsWith(`${href}/`);
      return (
        <Link
          aria-current={active ? "page" : undefined}
          className={`rounded-xl px-3 py-2.5 text-sm font-medium transition ${
            active
              ? "bg-indigo-500/20 text-white"
              : "text-slate-300 hover:bg-white/10 hover:text-white"
          } ${mobile ? "whitespace-nowrap" : ""}`}
          href={href}
          key={href}
        >
          {label}
        </Link>
      );
    });
  }

  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-40 hidden h-dvh w-64 flex-col border-r border-white/10 bg-slate-900 px-4 py-6 lg:flex">
        <Link
          className="mb-8 px-3 text-xl font-bold tracking-tight text-white"
          href="/seller"
        >
          MyShop <span className="text-indigo-300">Seller</span>
        </Link>
        <nav aria-label="Seller navigation" className="grid gap-1">
          {renderLinks()}
        </nav>
      </aside>
      <nav
        aria-label="Seller navigation"
        className="flex gap-2 overflow-x-auto border-b border-white/10 bg-slate-900 px-3 py-3 lg:hidden"
      >
        {renderLinks(true)}
      </nav>
    </>
  );
}
