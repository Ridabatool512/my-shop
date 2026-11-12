"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { label: "Dashboard", href: "/super-admin" },
  { label: "Seller Messages", href: "/super-admin/seller-messages" },
  { label: "Orders", href: "/super-admin/orders" },
  { label: "Withdraw Requests", href: "/super-admin/withdraw-requests" },
  { label: "Withdraw History", href: "/super-admin/withdraw-history" },
  { label: "All Buyers", href: "/super-admin/buyers" },
  { label: "All Sellers", href: "/super-admin/sellers" },
  { label: "All Admins", href: "/super-admin/admins" },
];

export default function SuperAdminSidebar() {
  const pathname = usePathname();

  function navigationLinks(mobile = false) {
    return links.map((link) => {
      const active =
        link.href === "/super-admin"
          ? pathname === link.href
          : pathname === link.href || pathname.startsWith(`${link.href}/`);
      return (
        <Link
          aria-current={active ? "page" : undefined}
          className={`rounded-xl px-3 py-2.5 text-sm font-medium transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400 ${
            active
              ? "bg-indigo-500/20 text-white"
              : "text-slate-300 hover:bg-white/10 hover:text-white"
          } ${mobile ? "whitespace-nowrap" : ""}`}
          href={link.href}
          key={link.href}
        >
          {link.label}
        </Link>
      );
    });
  }

  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-40 hidden h-screen w-64 flex-col border-r border-white/10 bg-slate-900 px-4 py-6 lg:flex">
        <Link
          className="mb-8 px-3 text-xl font-bold tracking-tight text-white"
          href="/super-admin"
        >
          MyShop <span className="text-indigo-300">Admin</span>
        </Link>
        <nav aria-label="Super Admin navigation" className="grid gap-1">
          {navigationLinks()}
        </nav>
      </aside>
      <nav
        aria-label="Super Admin navigation"
        className="flex gap-2 overflow-x-auto border-b border-white/10 bg-slate-900 px-3 py-3 lg:hidden"
      >
        {navigationLinks(true)}
      </nav>
    </>
  );
}
