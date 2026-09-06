"use client";

import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useState } from "react";
import { useRouter } from "next/navigation";

type RegisterStatus =
  | "idle"
  | "loading"
  | "success"
  | "email-confirmed"
  | "rate-limited"
  | "error";

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

export default function RegisterPage() {
  const router = useRouter();

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<RegisterStatus>("idle");
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

  async function handleRegister(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const normalizedUsername = username.trim();
    if (normalizedUsername.length < 3) {
      setStatus("error");
      setMessage("Username must be at least 3 characters long.");
      return;
    }
    if (!/^[a-zA-Z0-9_.-]+$/.test(normalizedUsername)) {
      setStatus("error");
      setMessage(
        "Username can only contain letters, numbers, underscores, dots and hyphens."
      );
      return;
    }

    setStatus("loading");
    setMessage("");

    const supabase = createClient();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name: normalizedUsername,
          username: normalizedUsername,
          role,
        },
      },
    });

    if (error) {
      // Handle rate-limit errors (Supabase may return 429 as a generic error)
      if (
        error.status === 429 ||
        error.message.includes("rate limit") ||
        error.message.includes("too many")
      ) {
        setStatus("rate-limited");
        setMessage(
          "Too many requests. Please wait a minute before trying again."
        );
      } else if (error.message.includes("already registered")) {
        setStatus("error");
        setMessage(
          "An account with this email already exists. Try logging in instead."
        );
      } else if (
        error.message.includes("duplicate key") ||
        error.message.toLowerCase().includes("username")
      ) {
        setStatus("error");
        setMessage(
          "That username is already taken. Try another one."
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

    // If Supabase returns no error but the user already has a session,
    // email confirmation is disabled or auto-confirm is on
    if (data.session) {
      setStatus("email-confirmed");
      setMessage("Account created and signed in successfully!");
      router.push("/dashboard");
    } else {
      setStatus("success");
      setMessage(
        "Account created! Check your email inbox (and spam folder) for a verification link."
      );
      startResendCooldown();
    }
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
      } else if (isNetworkError(error)) {
        setStatus("error");
        setMessage(NETWORK_ERROR_MESSAGE);
      } else {
        setStatus("error");
        setMessage(error.message);
      }
      return;
    }

    setStatus("success");
    setMessage("Verification email sent! Check your inbox and spam folder.");
    startResendCooldown();
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-6 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <Link
            href="/"
            className="text-2xl font-bold tracking-tight text-slate-950"
          >
            Finora
          </Link>
          <h1 className="mt-6 text-3xl font-bold text-slate-950">
            Create your account
          </h1>
          <p className="mt-2 text-slate-600">
            Start managing your finances in one place.
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          {/* Success state: show resend option */}
          {status === "success" ? (
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

              <p className="mt-4 text-sm text-slate-500">
                Didn&apos;t receive it? Check your spam folder or request a
                new link.
              </p>

              <button
                type="button"
                onClick={handleResendVerification}
                disabled={resendCooldown > 0}
                className="mt-4 inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {resendCooldown > 0
                  ? `Resend in ${resendCooldown}s`
                  : "Resend verification email"}
              </button>

              <p className="mt-6 text-sm text-slate-600">
                <Link
                  href="/login"
                  className="font-semibold text-slate-900 hover:underline"
                >
                  Back to login
                </Link>
              </p>
            </div>
          ) : status === "email-confirmed" ? (
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
                    d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>

              <h2 className="text-lg font-semibold text-slate-950">
                Welcome to Finora!
              </h2>

              <p className="mt-2 text-sm text-slate-600">{message}</p>

              <Link
                href="/dashboard"
                className="mt-6 inline-flex rounded-lg bg-slate-900 px-6 py-3 font-semibold text-white transition hover:bg-slate-800"
              >
                Go to Dashboard
              </Link>
            </div>
          ) : (
            <form onSubmit={handleRegister} className="space-y-5">
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
                  placeholder="Choose a username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  minLength={3}
                  autoComplete="username"
                  className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none transition focus:border-slate-900"
                />
                <p className="mt-1.5 text-xs text-slate-400">
                  Letters, numbers, underscores, dots and hyphens. This is what
                  you&apos;ll use to log in.
                </p>
              </div>

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
                <label
                  htmlFor="password"
                  className="mb-2 block text-sm font-medium text-slate-700"
                >
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  placeholder="Create a password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none transition focus:border-slate-900"
                />
              </div>

              <div>
                <label
                  htmlFor="role"
                  className="mb-2 block text-sm font-medium text-slate-700"
                >
                  Account type
                </label>
                <select
                  id="role"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  required
                  className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 outline-none focus:border-slate-900"
                >
                  <option value="" disabled>
                    Select account type
                  </option>
                  <option value="student">Student</option>
                  <option value="employee">Employee</option>
                  <option value="employer">Employer</option>
                </select>
              </div>

              {/* Error / rate-limit message */}
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
                {status === "loading" ? "Creating..." : "Create Account"}
              </button>
            </form>
          )}

          {status !== "success" && status !== "email-confirmed" && (
            <p className="mt-6 text-center text-sm text-slate-600">
              Already have an account?{" "}
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
