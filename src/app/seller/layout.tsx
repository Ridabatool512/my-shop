import { auth } from "@/auth";
import SignOutButton from "@/app/components/SignOutButton";

export const instant = false;
import SellerSidebar from "@/app/seller/SellerSidebar";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function SellerLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "SELLER") redirect("/");

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="min-w-0 lg:ml-64">
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-white/10 bg-slate-950/90 px-4 py-3.5 text-white shadow-sm backdrop-blur sm:px-6 lg:px-8">
          <Link
            href="/seller"
            className="myshop-logo text-lg font-bold tracking-tight text-white"
          >
            <span className="relative z-[2]">
              <span>My</span>
              <span className="myshop-logo-shop">Shop</span>
            </span>
          </Link>
          <SignOutButton
            callbackUrl="/"
            className="myshop-nav-link myshop-signout-link"
          />
        </header>
        <SellerSidebar />
        <main className="min-w-0 px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
