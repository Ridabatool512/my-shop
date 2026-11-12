"use client";

import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

export default function SignupForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState<"BUYER" | "SELLER">("BUYER");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, role }),
      });

      const body: unknown = await response.json();
      const apiError =
        typeof body === "object" &&
        body !== null &&
        "error" in body &&
        typeof body.error === "string"
          ? body.error
          : "Unable to create your account.";

      if (!response.ok) {
        throw new Error(apiError);
      }

      const result = await signIn("credentials", {
        email,
        password,
        accountType: "normal",
        redirect: false,
      });

      if (!result || result.error) {
        router.replace("/login?registered=true");
        router.refresh();
        return;
      }

      router.replace(role === "SELLER" ? "/seller" : "/");
      router.refresh();
    } catch (signupError) {
      setError(
        signupError instanceof Error
          ? signupError.message
          : "Unable to create your account. Please try again."
      );
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
            Create your account
          </h1>
          <p className="text-sm text-slate-300">
            Join as a buyer or seller to get started.
          </p>
        </div>

        <div className="space-y-4">
          <label className="block space-y-2 text-sm font-medium text-slate-200">
            <span>Name</span>
            <input
              type="text"
              name="name"
              autoComplete="name"
              required
              maxLength={100}
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="w-full rounded-xl border border-slate-600 bg-slate-950/70 px-4 py-3 text-white outline-none focus:border-sky-400 focus:ring-4 focus:ring-sky-400/15"
            />
          </label>

          <label className="block space-y-2 text-sm font-medium text-slate-200">
            <span>Email</span>
            <input
              type="email"
              name="email"
              autoComplete="email"
              required
              maxLength={254}
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full rounded-xl border border-slate-600 bg-slate-950/70 px-4 py-3 text-white outline-none focus:border-sky-400 focus:ring-4 focus:ring-sky-400/15"
            />
          </label>

          <label className="block space-y-2 text-sm font-medium text-slate-200">
            <span>Password</span>
            <span className="relative block">
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                autoComplete="new-password"
                required
                minLength={8}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full rounded-xl border border-slate-600 bg-slate-950/70 px-4 py-3 pr-12 text-white outline-none focus:border-sky-400 focus:ring-4 focus:ring-sky-400/15"
              />
              <button
                type="button"
                aria-label={showPassword ? "Hide password" : "Show password"}
                aria-pressed={showPassword}
                onClick={() => setShowPassword((visible) => !visible)}
                className="absolute inset-y-0 right-0 grid w-12 place-items-center text-slate-400 transition hover:text-sky-300 focus-visible:outline-2 focus-visible:outline-sky-400"
              >
                <svg
                  aria-hidden="true"
                  className="size-5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  viewBox="0 0 24 24"
                >
                  {showPassword ? (
                    <>
                      <path
                        d="M3 3l18 18M10.6 10.6a2 2 0 002.8 2.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <path
                        d="M9.9 5.2A10.8 10.8 0 0112 5c5 0 8.5 4.2 9.5 7-.4 1.1-1.3 2.5-2.7 3.8M6.2 6.2C3.9 7.6 2.8 9.5 2.5 12c.5 1.4 1.7 3.3 3.8 4.8A10 10 0 0012 19c1.1 0 2.1-.2 3-.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </>
                  ) : (
                    <>
                      <path
                        d="M2.5 12S6 5 12 5s9.5 7 9.5 7-3.5 7-9.5 7-9.5-7-9.5-7z"
                        strokeLinejoin="round"
                      />
                      <circle cx="12" cy="12" r="3" />
                    </>
                  )}
                </svg>
              </button>
            </span>
            <span className="block text-xs font-normal text-slate-400">
              Use at least 8 characters.
            </span>
          </label>

          <label className="block space-y-2 text-sm font-medium text-slate-200">
            <span>Account type</span>
            <select
              name="role"
              value={role}
              onChange={(event) =>
                setRole(event.target.value as "BUYER" | "SELLER")
              }
              className="w-full rounded-xl border border-slate-600 bg-slate-950/70 px-4 py-3 text-white outline-none focus:border-sky-400 focus:ring-4 focus:ring-sky-400/15"
            >
              <option value="BUYER">Buyer</option>
              <option value="SELLER">Seller</option>
            </select>
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
          {isSubmitting ? "Creating account..." : "Create account"}
        </button>

        <p className="text-center text-sm text-slate-300">
          Already have an account?{" "}
          <a
            href="/login"
            className="font-semibold text-sky-300 hover:text-sky-200"
          >
            Sign in
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
