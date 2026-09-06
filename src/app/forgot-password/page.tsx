"use client";

import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useState } from "react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "sent" | "error" | "rate-limited">("idle");
  const [message, setMessage] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("loading");
    setMessage("");

    const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
    });

    if (error) {
      if (
        error.status === 429 ||
        error.message.includes("rate limit") ||
        error.message.includes("too many")
      ) {
        setStatus("rate-limited");
        setMessage("Too many requests. Please wait a minute before trying again.");
      } else {
        setStatus("error");
        setMessage(error.message);
      }
      return;
    }

    setStatus("sent");
    setMessage("Check your email for a password reset link.");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-6">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <Link
            href="/"
            className="text-2xl font-bold tracking-tight text-slate-950"
          >
            Finora
          </Link>
          <h1 className="mt-6 text-3xl font-bold text-slate-950">
            Reset your password
          </h1>
          <p className="mt-2 text-slate-600">
            Enter your email and we&apos;ll send you a reset link.
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          {status === "sent" ? (
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100">
                <svg
                  className="h-6 w-6 text-emerald-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75"
                  />
                </svg>
              </div>
              <h2 className="text-lg font-semibold text-slate-950">
                Check your email
              </h2>
              <p className="mt-2 text-sm text-slate-600">{message}</p>
              <p className="mt-4 text-xs text-slate-500">
                The link will expire in 1 hour. Check your spam folder if you
                don&apos;t see it.
              </p>
              <Link
                href="/login"
                className="mt-6 inline-flex rounded-lg bg-slate-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                Back to login
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label
                  htmlFor="email"
                  className="mb-2 block text-sm font-medium text-slate-700"
                >
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none transition focus:border-slate-900"
                />
              </div>

              {(status === "error" || status === "rate-limited") && (
                <div
                  className={`rounded-lg px-4 py-3 text-sm ${
                    status === "rate-limited"
                      ? "border border-amber-200 bg-amber-50 text-amber-800"
                      : "border border-red-200 bg-red-50 text-red-800"
                  }`}
                >
                  {message}
                </div>
              )}

              <button
                type="submit"
                disabled={status === "loading"}
                className="w-full rounded-lg bg-slate-900 px-6 py-3 font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {status === "loading" ? "Sending..." : "Send reset link"}
              </button>
            </form>
          )}

          {status !== "sent" && (
            <p className="mt-6 text-center text-sm text-slate-600">
              Remember your password?{" "}
              <Link
                href="/login"
                className="font-semibold text-slate-900 hover:underline"
              >
                Login
              </Link>
            </p>
          )}
        </div>
      </div>
    </main>
  );
}
