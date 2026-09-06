"use client";

import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

type LoginStatus = "idle" | "loading" | "error" | "rate-limited" | "unverified";

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState(() =>
    searchParams.get("error") === "auth_callback_error"
      ? "Something went wrong during verification. Please try logging in again."
      : ""
  );
  const [status, setStatus] = useState<LoginStatus>(() =>
    searchParams.get("error") === "auth_callback_error" ? "error" : "idle"
  );
  const [resendCooldown, setResendCooldown] = useState(0);

  function startResendCooldown() {
    setResendCooldown(60);
    const interval = setInterval(() => {
      setResendCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }

  async function handleLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    setStatus("loading");
    setMessage("");

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      if (
        error.status === 429 ||
        error.message.includes("rate limit") ||
        error.message.includes("too many")
      ) {
        setStatus("rate-limited");
        setMessage(
          "Too many login attempts. Please wait a minute before trying again."
        );
      } else if (
        error.message.includes("Email not confirmed") ||
        error.message.includes("email not verified")
      ) {
        setStatus("unverified");
        setMessage(
          "Your email hasn't been verified yet. Please check your inbox or resend the verification email below."
        );
        startResendCooldown();
      } else if (error.message.includes("Invalid login")) {
        setStatus("error");
        setMessage("Invalid email or password. Please try again.");
      } else {
        setStatus("error");
        setMessage(error.message);
      }
      return;
    }

    router.push("/dashboard");
  }

  async function handleResendVerification() {
    setStatus("loading");
    setMessage("");

    const supabase = createClient();
    const { error } = await supabase.auth.resend({
      type: "signup",
      email,
    });

    if (error) {
      if (
        error.status === 429 ||
        error.message.includes("rate limit") ||
        error.message.includes("too many")
      ) {
        setStatus("rate-limited");
        setMessage(
          "Too many requests. Please wait a minute before trying again."
        );
      } else {
        setStatus("error");
        setMessage(error.message);
      }
      return;
    }

    setStatus("unverified");
    setMessage("Verification email sent! Check your inbox and spam folder.");
    startResendCooldown();
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
            Welcome back
          </h1>
          <p className="mt-2 text-slate-600">
            Login to continue managing your finances.
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <form onSubmit={handleLogin} className="space-y-5">
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

            <div>
              <div className="mb-2 flex items-center justify-between">
                <label
                  htmlFor="password"
                  className="text-sm font-medium text-slate-700"
                >
                  Password
                </label>
                <Link
                  href="/forgot-password"
                  className="text-xs font-medium text-slate-500 hover:text-slate-900"
                >
                  Forgot password?
                </Link>
              </div>
              <input
                id="password"
                type="password"
                placeholder="Your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none transition focus:border-slate-900"
              />
            </div>

            {/* Error / rate-limit / unverified message */}
            {(status === "error" ||
              status === "rate-limited" ||
              status === "unverified") && (
              <div
                className={`rounded-lg px-4 py-3 text-sm ${
                  status === "rate-limited"
                    ? "border border-amber-200 bg-amber-50 text-amber-800"
                    : status === "unverified"
                      ? "border border-blue-200 bg-blue-50 text-blue-800"
                      : "border border-red-200 bg-red-50 text-red-800"
                }`}
              >
                {message}
              </div>
            )}

            {/* Resend verification button (visible when unverified) */}
            {status === "unverified" && (
              <button
                type="button"
                onClick={handleResendVerification}
                disabled={resendCooldown > 0}
                className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {resendCooldown > 0
                  ? `Resend in ${resendCooldown}s`
                  : "Resend verification email"}
              </button>
            )}

            <button
              type="submit"
              disabled={status === "loading"}
              className="w-full rounded-lg bg-slate-900 px-6 py-3 font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {status === "loading" ? "Logging in..." : "Login"}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-600">
            Don&apos;t have an account?{" "}
            <Link
              href="/register"
              className="font-semibold text-slate-900 hover:underline"
            >
              Create one
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
