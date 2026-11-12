import { auth } from "@/auth";
import SellerCustomerSupport from "@/app/seller/SellerCustomerSupport";
import { redirect } from "next/navigation";

export default async function SellerCustomerSupportPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "SELLER") redirect("/");

  return (
    <div className="mx-auto max-w-4xl">
      <header className="mb-7">
        <p className="text-sm font-semibold uppercase tracking-wider text-indigo-600">
          Seller Workspace
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
          Customer Support
        </h1>
        <p className="mt-2 text-slate-600">
          Contact Super Admin for help with your orders and account.
        </p>
      </header>
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="mb-5 text-sm text-slate-600">
          Start a private support conversation. You can also attach a payment slip.
        </p>
        <SellerCustomerSupport />
      </section>
    </div>
  );
}
