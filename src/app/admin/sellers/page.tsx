import { auth } from "@/auth";
import SellerApprovalRequests from "@/app/admin/SellerApprovalRequests";

export const instant = false;
import SignOutButton from "@/app/components/SignOutButton";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function AdminSellersPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/staff-access");
  }

  if (session.user.role !== "ADMIN") {
    redirect("/");
  }

  const managedAdmin = await prisma.user.findFirst({
    where: {
      id: session.user.id,
      role: "ADMIN",
      createdBy: { is: { role: "SUPER_ADMIN" } },
    },
    select: { id: true },
  });

  if (!managedAdmin) {
    redirect("/");
  }

  const sellers = await prisma.user.findMany({
    where: { role: "SELLER" },
    select: {
      id: true,
      name: true,
      email: true,
      createdAt: true,
      isApproved: true,
    },
    orderBy: [{ isApproved: "asc" }, { createdAt: "asc" }],
  });

  return (
    <main className="min-h-screen bg-slate-100 text-slate-900">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 bg-white px-5 py-4 sm:px-8">
        <div>
          <Link
            className="text-sm font-semibold text-indigo-600 hover:text-indigo-700"
            href="/admin"
          >
            ← Admin dashboard
          </Link>
          <h1 className="mt-1 text-2xl font-bold tracking-tight">
            Seller management
          </h1>
        </div>
        <SignOutButton callbackUrl="/staff-access" />
      </header>
      <section className="mx-auto max-w-6xl space-y-5 p-5 sm:p-8">
        <div>
          <h2 className="text-lg font-bold text-slate-900">All sellers</h2>
          <p className="mt-1 text-sm text-slate-500">
            Review approval status and approve pending seller accounts.
          </p>
        </div>
        <SellerApprovalRequests
          sellers={sellers.map((seller) => ({
            ...seller,
            createdAt: seller.createdAt.toISOString(),
          }))}
        />
      </section>
    </main>
  );
}
