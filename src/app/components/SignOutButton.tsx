"use client";

import { signOut } from "next-auth/react";

export default function SignOutButton({
  callbackUrl,
  className = "",
}: {
  callbackUrl: string;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={() => signOut({ callbackUrl })}
      className={`rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 ${className}`}
    >
      Sign Out
    </button>
  );
}
