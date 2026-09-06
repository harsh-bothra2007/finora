"use client";

import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

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
  const [googleLoading, setGoogleLoading] = useState(false);

  function startResendCooldown() {
    setResendCooldown(60);
    const interval = setInterval(() => {
      setResendCooldown((prev) => {
        if (prev <= 1) { clearInterval(interval); return 0; }
        return prev - 1;
      });
    }, 1000);
  }

  async function handleLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("loading");
    setMessage("");

    const supabase = createClient();

    // Try username + password if a username was entered; fall back to
    // email address directly (works without migration 004).
    const trimmed = username.trim();
    const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed);

    let email = trimmed;
    if (!isEmail) {
      const { data: resolvedEmail, error: resolveError } = await supabase.rpc(
        "get_email_by_username",
        { p_username: trimmed }
      );
      if (resolveError || !resolvedEmail) {
        setStatus("error");
        setMessage(
          isNetworkError(resolveError)
            ? NETWORK_ERROR_MESSAGE
            : "Invalid username or password. Please try again."
        );
        return;
      }
      email = resolvedEmail;
    }

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      if (error.status === 429 || error.message.includes("rate limit") || error.message.includes("too many")) {
        setStatus("rate-limited");
        setMessage("Too many login attempts. Please wait a minute before trying again.");
      } else if (error.message.includes("Email not confirmed") || error.message.includes("email not verified")) {
        setStatus("unverified");
        setMessage("Your email hasn't been verified yet. Check your inbox or resend the verification email below.");
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

    if (!username) {
      setStatus("error");
      setMessage("Please try logging in once before resending the email.");
      return;
    }

    const supabase = createClient();
    const trimmed = username.trim();
    const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed);
    const email = isEmail ? trimmed : await resolveUsernameEmail(supabase, trimmed);

    if (!email) {
      setStatus("error");
      setMessage("Could not find that username. Try logging in first.");
      return;
    }

    const { error } = await supabase.auth.resend({ type: "signup", email });

    if (error) {
      if (error.status === 429 || error.message.includes("rate limit") || error.message.includes("too many")) {
        setStatus("rate-limited");
        setMessage("Too many requests. Please wait a minute before trying again.");
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

  async function resolveUsernameEmail(supabase: ReturnType<typeof createClient>, username: string): Promise<string | null> {
    const { data, error } = await supabase.rpc("get_email_by_username", { p_username: username });
    if (error || !data) return null;
    return data;
  }

  async function handleGoogleSignIn() {
    setGoogleLoading(true);
    setMessage("");
    try {
      const supabase = createClient();
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) {
        setGoogleLoading(false);
        setStatus("error");
        setMessage(
          error.message.toLowerCase().includes("provider not enabled") ||
          error.message.toLowerCase().includes("provider")
            ? "Google sign-in isn't enabled in your Supabase project yet. Enable it under Authentication → Sign In / Providers → Google."
            : isNetworkError(error)
              ? NETWORK_ERROR_MESSAGE
              : error.message
        );
        return;
      }

      // signInWithOAuth returns the Google authorization URL. Navigate
      // explicitly instead of relying on the library's internal redirect,
      // so the "couldn't start" warning can never race with a working flow.
      if (data?.url) {
        window.location.href = data.url;
        return;
      }

      // No URL and no error — something unexpected happened.
      setGoogleLoading(false);
      setStatus("error");
      setMessage("Google sign-in didn't start. Please try again.");
    } catch (err) {
      setGoogleLoading(false);
      setStatus("error");
      setMessage(
        isNetworkError(err)
          ? NETWORK_ERROR_MESSAGE
          : err instanceof Error
            ? err.message
            : "Something went wrong."
      );
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-6">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <Link href="/" className="text-2xl font-bold tracking-tight text-slate-950">
            Finora
          </Link>
          <h1 className="mt-6 text-3xl font-bold text-slate-950">Welcome back</h1>
          <p className="mt-2 text-slate-600">Login to continue managing your finances.</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label htmlFor="username" className="mb-2 block text-sm font-medium text-slate-700">
                Username or email
              </label>
              <input
                id="username"
                type="text"
                placeholder="your_username or you@example.com"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                autoComplete="username"
                className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none transition focus:border-slate-900"
              />
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between">
                <label htmlFor="password" className="text-sm font-medium text-slate-700">
                  Password
                </label>
                <Link href="/forgot-password" className="text-xs font-medium text-slate-500 hover:text-slate-900">
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

            {(status === "error" || status === "rate-limited" || status === "unverified") && (
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

            {status === "unverified" && (
              <button
                type="button"
                onClick={handleResendVerification}
                disabled={resendCooldown > 0}
                className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend verification email"}
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

          {/* Divider */}
          <div className="my-5 flex items-center gap-3">
            <div className="flex-1 h-px bg-slate-200" />
            <span className="text-xs text-slate-400">or continue with</span>
            <div className="flex-1 h-px bg-slate-200" />
          </div>

          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={googleLoading}
            className="w-full rounded-lg border border-slate-300 bg-white px-6 py-3 font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 flex items-center justify-center gap-2"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
              <path
                fill="currentColor"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="currentColor"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="currentColor"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="currentColor"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.82 14.97 2 12 2 7.7 2 3.99 4.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            {googleLoading ? "Signing in..." : "Sign in with Google"}
          </button>

          <p className="mt-6 text-center text-sm text-slate-600">
            Don&apos;t have an account?{" "}
            <Link href="/register" className="font-semibold text-slate-900 hover:underline">
              Create one
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
