"use client";

import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  DEMO_EMAIL,
  DEMO_PASSWORD,
  DEMO_USERNAME,
  demoModeEnabled,
  seedDemoData,
} from "@/lib/demo";

type LoginStatus = "idle" | "loading" | "error" | "rate-limited" | "unverified";

const NETWORK_ERROR_MESSAGE =
  "Can't reach the server right now. Check your internet connection and try again.";

function isNetworkError(err: unknown): boolean {
  const raw =
    err && typeof err === "object" && "message" in err
      ? (err as { message: unknown }).message
      : err instanceof Error
        ? err.message
        : err ?? "";
  const msg = String(raw).toLowerCase();
  return (
    msg.includes("fetch failed") ||
    msg.includes("failed to fetch") ||
    msg.includes("network") ||
    msg.includes("load failed") ||
    msg.includes("enotfound") ||
    msg.includes("unable to connect") ||
    msg.includes("socket")
  );
}

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

  const [username, setUsername] = useState("");
  const [accountEmail, setAccountEmail] = useState("");
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
  const [demoLoading, setDemoLoading] = useState(false);
  const [demoError, setDemoError] = useState("");

  async function handleDemoLogin() {
    setDemoLoading(true);
    setDemoError("");
    try {
      // Ensure the demo user exists server-side (only works when
      // SUPABASE_SERVICE_ROLE_KEY is configured — harmless otherwise).
      const res = await fetch("/api/demo/login", { method: "POST" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.ok) {
        throw new Error(
          json.error ?? "Demo login failed. Please try again later."
        );
      }

      const supabase = createClient();

      // Try signing in — this works when the admin already created the user
      const { error: signInError } =
        await supabase.auth.signInWithPassword({
          email: DEMO_EMAIL,
          password: DEMO_PASSWORD,
        });

      if (!signInError) {
        router.push("/dashboard");
        return;
      }

      // If the admin had the service role key, sign-in should have worked.
      // Surface the real error instead of silently falling through.
      if (json.adminSetup) {
        throw new Error(
          signInError.message.includes("Email not confirmed")
            ? "The demo account email is not confirmed. Please confirm it in your Supabase dashboard or disable email confirmation."
            : signInError.message
        );
      }

      // No SERVICE_ROLE_KEY — try creating the demo user client-side.
      // This only works when the project doesn't require email confirmation
      // (common in development).
      if (
        signInError.message.includes("Invalid login") ||
        signInError.message.includes("Email not confirmed")
      ) {
        const { data: signUpData, error: signUpError } =
          await supabase.auth.signUp({
            email: DEMO_EMAIL,
            password: DEMO_PASSWORD,
            options: {
              data: { name: "Demo User", username: DEMO_USERNAME },
            },
          });

        if (signUpError) {
          if (signUpError.message.toLowerCase().includes("already registered")) {
            throw new Error(
              "The demo account needs one-time setup: configure SUPABASE_SERVICE_ROLE_KEY, or disable email confirmation in your Supabase project."
            );
          }
          throw signUpError;
        }

        if (!signUpData.session || !signUpData.user) {
          throw new Error(
            "The demo account needs one-time setup: configure SUPABASE_SERVICE_ROLE_KEY, or disable email confirmation in your Supabase project."
          );
        }

        // Just created the account — seed sample data. RLS lets the
        // signed-in demo user insert their own rows.
        await seedDemoData(supabase, signUpData.user.id);
        router.push("/dashboard");
        return;
      }

      throw signInError;
    } catch (err) {
      setDemoError(
        isNetworkError(err)
          ? NETWORK_ERROR_MESSAGE
          : err instanceof Error
            ? err.message
            : "Something went wrong."
      );
      setDemoLoading(false);
    }
  }

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

    // Resolve the username to its account email, then sign in with it
    const { data: email, error: resolveError } = await supabase.rpc(
      "get_email_by_username",
      { p_username: username.trim() }
    );

    if (resolveError || !email) {
      setStatus("error");
      setMessage(
        isNetworkError(resolveError)
          ? NETWORK_ERROR_MESSAGE
          : "Invalid username or password. Please try again."
      );
      return;
    }
    setAccountEmail(email);

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
        setMessage("Invalid username or password. Please try again.");
      } else if (isNetworkError(error)) {
        setStatus("error");
        setMessage(NETWORK_ERROR_MESSAGE);
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

    if (!accountEmail) {
      setStatus("error");
      setMessage("Please try logging in once before resending the email.");
      return;
    }

    const supabase = createClient();
    const { error } = await supabase.auth.resend({
      type: "signup",
      email: accountEmail,
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
      } else if (isNetworkError(error)) {
        setStatus("error");
        setMessage(NETWORK_ERROR_MESSAGE);
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
                htmlFor="username"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                Username
              </label>
              <input
                id="username"
                type="text"
                placeholder="your_username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                autoComplete="username"
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

          {/* DEMO-ONLY: remove this block (and the handleDemoLogin handler
              above) to disable the demo account feature */}
          {demoModeEnabled && (
            <>
              <div className="my-4 flex items-center gap-3">
                <div className="h-px flex-1 bg-slate-200" />
                <span className="text-xs text-slate-400">or</span>
                <div className="h-px flex-1 bg-slate-200" />
              </div>

              <button
                type="button"
                onClick={handleDemoLogin}
                disabled={demoLoading}
                className="w-full rounded-lg border border-slate-300 bg-white px-6 py-3 font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {demoLoading ? "Logging in..." : "🚀 Try Demo Dashboard"}
              </button>

              <p className="mt-2 text-center text-xs text-slate-400">
                One-click demo account with sample data — no signup needed.
              </p>

              {demoError && (
                <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                  {demoError}
                </div>
              )}
            </>
          )}

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
