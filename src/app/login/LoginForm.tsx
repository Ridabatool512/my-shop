"use client";

import { getSession, signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

export default function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const result = await signIn("credentials", {
        email,
        password,
        accountType: "normal",
        redirect: false,
      });

      if (!result || result.error) {
        setError(
          result?.code === "seller_pending_approval"
            ? "Your seller account is pending approval from Admin."
            : result?.code === "account_frozen"
              ? "Your account has been frozen by Super Admin"
            : "Email or password is incorrect."
        );
        return;
      }

      const session = await getSession();
      const role = session?.user.role;
      const callbackUrl = new URLSearchParams(window.location.search).get(
        "callbackUrl"
      );
      const safeCallbackUrl =
        callbackUrl?.startsWith("/") && !callbackUrl.startsWith("//")
          ? callbackUrl
          : null;

      if (role === "SELLER") {
        router.replace("/seller");
      } else if (role === "BUYER") {
        router.replace(safeCallbackUrl ?? "/");
      } else {
        setError("This login is for Buyer and Seller accounts.");
        return;
      }

      router.refresh();
    } catch {
      setError("Unable to sign in. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="auth-page-background flex min-h-screen flex-col items-center justify-center gap-8 px-4 py-12">
      <form
        onSubmit={handleSubmit}
        className="auth-glass-card space-y-6 p-8 sm:p-10"
      >
        <div className="space-y-2">
          <p className="text-sm font-semibold uppercase tracking-wider text-sky-300">
            MyShop
          </p>
          <h1 className="text-3xl font-bold tracking-tight text-white">
            Welcome back
          </h1>
          <p className="text-sm text-slate-300">
            Sign in to continue to your account.
          </p>
        </div>

        <div className="space-y-4">
          <label className="block space-y-2 text-sm font-medium text-slate-200">
            <span>Email</span>
            <input
              type="email"
              name="email"
              autoComplete="username"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full rounded-xl border border-slate-600 bg-slate-950/70 px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-sky-400 focus:ring-4 focus:ring-sky-400/15"
              placeholder="you@example.com"
            />
          </label>

          <label className="block space-y-2 text-sm font-medium text-slate-200">
            <span>Password</span>
            <input
              type="password"
              name="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded-xl border border-slate-600 bg-slate-950/70 px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-sky-400 focus:ring-4 focus:ring-sky-400/15"
              placeholder="Enter your password"
            />
          </label>
        </div>

        {error && (
          <p
            role="alert"
            className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
          >
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:cursor-wait disabled:opacity-60"
        >
          {isSubmitting ? "Signing in..." : "Sign in"}
        </button>
        <p className="text-center text-sm text-slate-300">
          New to MyShop?{" "}
          <a
            href="/signup"
            className="font-semibold text-sky-300 hover:text-sky-200"
          >
            Create an account
          </a>
        </p>
      </form>
      <footer className="auth-page-footer flex max-w-md flex-col items-center gap-4 text-center text-xs text-slate-400">
        <nav aria-label="Legal and help links" className="flex flex-wrap justify-center gap-x-5 gap-y-2">
          <a href="/conditions-of-use">Conditions of Use</a>
          <a href="/privacy-notice">Privacy Notice</a>
          <a href="/help">Help</a>
        </nav>
        <p>© 2006-2026, MyShop.com, Inc. or its affiliates</p>
      </footer>
    </main>
  );
}
