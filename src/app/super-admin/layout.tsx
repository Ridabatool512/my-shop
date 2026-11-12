import { auth } from "@/auth";
import SignOutButton from "@/app/components/SignOutButton";
import SuperAdminSidebar from "@/app/super-admin/SuperAdminSidebar";
import { redirect } from "next/navigation";

export default async function SuperAdminLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const session = await auth();

  if (!session?.user) redirect("/staff-access");
  if (session.user.role !== "SUPER_ADMIN") redirect("/");

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <SuperAdminSidebar />
      <div className="min-w-0 lg:ml-64">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 bg-slate-950/90 px-5 py-4 sm:px-8">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-300">
              MyShop / Executive
            </p>
            <p className="mt-1 text-lg font-bold text-white">Super Admin Panel</p>
          </div>
          <SignOutButton
            callbackUrl="/staff-access"
            className="border-white/10 bg-white/5 text-slate-200 hover:bg-white/10 hover:text-white"
          />
        </header>
        <main className="min-w-0 px-4 py-6 sm:px-6 lg:px-8">
          <div className="mx-auto w-full max-w-[1500px]">{children}</div>
        </main>
      </div>
    </div>
  );
}
