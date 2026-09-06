"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { updateProfile } from "@/lib/supabase/queries";
import type { Profile } from "@/lib/types/database";

interface SettingsFormProps {
  userId: string;
  initialProfile: Profile;
  initialEmail: string;
  providers: string[];
}

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

export default function SettingsForm({
  userId,
  initialProfile,
  initialEmail,
  providers,
}: SettingsFormProps) {
  const email = initialEmail as string;
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [activeTab, setActiveTab] = useState<"profile" | "password">("profile");

  // Profile fields
  const [username, setUsername] = useState(initialProfile.username ?? "");
  const [name, setName] = useState(initialProfile.name ?? "");
  const [role, setRole] = useState<"student" | "employee" | "employer">(
    (initialProfile.role as "student" | "employee" | "employer") ?? "student"
  );

  // Password fields
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "error" | "success">("idle");

  function validateUsername(v: string): string | null {
    if (v.length < 3) return "Username must be at least 3 characters.";
    if (!/^[a-zA-Z0-9_.-]+$/.test(v)) return "Only letters, numbers, underscores, dots and hyphens.";
    return null;
  }

  function validatePassword(v: string): string | null {
    if (v.length < 6) return "Password must be at least 6 characters.";
    return null;
  }

  async function handleSaveProfile() {
    setStatus("loading");
    setMessage("");

    const usernameError = validateUsername(username);
    if (usernameError) {
      setStatus("error");
      setMessage(usernameError);
      return;
    }

    startTransition(async () => {
      const supabase = createClient();

      // Update auth metadata (username + name stored in auth.user_metadata)
      const { error: authError } = await supabase.auth.updateUser({
        data: {
          username,
          name,
        },
      });

      if (authError) {
        setStatus("error");
        setMessage(
          isNetworkError(authError)
            ? "Can't reach the server right now. Check your internet connection and try again."
            : authError.message
        );
        return;
      }

      // Update profiles table
      let profileResult: { error?: unknown } = {};
      try {
        await updateProfile(userId, { name, role });
      } catch (e) {
        profileResult.error = e;
      }
      if (profileResult.error) {
        setStatus("error");
        setMessage(
          isNetworkError(profileResult.error)
            ? "Can't reach the server right now. Check your internet connection and try again."
            : String(profileResult.error)
        );
        return;
      }

      setStatus("success");
      setMessage("Profile updated successfully.");
      router.refresh();
    });
  }

  async function handleSavePassword() {
    setStatus("loading");
    setMessage("");

    if (!currentPassword) {
      setStatus("error");
      setMessage("Enter your current password to confirm.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setStatus("error");
      setMessage("New passwords don't match.");
      return;
    }

    const pwdError = validatePassword(newPassword);
    if (pwdError) {
      setStatus("error");
      setMessage(pwdError);
      return;
    }

    startTransition(async () => {
      const supabase = createClient();

      // 1. Get the current user so we know which email to verify against.
      const { data } = await supabase.auth.getUser();
      if (!data?.user) {
        setStatus("error");
        setMessage("Not logged in. Please log in again.");
        return;
      }
      const currentUser = data.user;

      // 2. Verify the current password by attempting a fresh sign-in.
      //    This proves the user knows the existing password before we let them
      //    change it. (Supabase's updateUser() only checks that the caller is
      //    signed in — it does not ask for the current password.)
      const { error: verifyError } = await supabase.auth.signInWithPassword({
        email: currentUser.email ?? "",
        password: currentPassword,
      });

      if (verifyError) {
        setStatus("error");
        setMessage(
          verifyError.message.includes("Invalid login") ||
          verifyError.message.includes("Incorrect") ||
          verifyError.message.includes("Invalid password")
            ? "That's not the right password. Try again."
            : isNetworkError(verifyError)
              ? "Can't reach the server right now. Check your internet connection and try again."
              : verifyError.message
        );
        return;
      }

      // 3. Update the password. The new password takes effect immediately.
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        setStatus("error");
        setMessage(
          isNetworkError(error)
            ? "Can't reach the server right now. Check your internet connection and try again."
            : error.message
        );
        return;
      }

      setStatus("success");
      setMessage("Password updated successfully.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      router.refresh();
    });
  }

  return (
    <main className="mx-auto max-w-7xl px-6 py-10 pl-64 lg:pl-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-slate-950">Settings</h1>
        <p className="mt-1 text-slate-600">Manage your account details and security.</p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6">
        {/* Tabs */}
        <div className="mb-6 flex gap-6 border-b border-slate-200">
          <button
            type="button"
            onClick={() => setActiveTab("profile")}
            className={`pb-3 text-sm font-medium transition border-b-2 ${
              activeTab === "profile"
                ? "border-slate-900 text-slate-900"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            Profile
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("password")}
            className={`pb-3 text-sm font-medium transition border-b-2 ${
              activeTab === "password"
                ? "border-slate-900 text-slate-900"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            Password
          </button>
        </div>

        {/* Messages */}
        {status !== "idle" && (
          <div
            className={`mb-6 rounded-lg px-4 py-3 text-sm ${
              status === "success"
                ? "border border-emerald-200 bg-emerald-50 text-emerald-800"
                : status === "error"
                  ? "border border-red-200 bg-red-50 text-red-800"
                  : "border border-amber-200 bg-amber-50 text-amber-800"
            }`}
          >
            {message}
          </div>
        )}

        {/* Profile tab */}
        {activeTab === "profile" && (
          <div className="space-y-5">
            {/* Email (read-only) */}
            <div key="email">
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                Email
              </label>
              <input
                type="email"
                value={email}
                readOnly
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-600 outline-none transition cursor-not-allowed"
              />
              <p className="mt-1 text-xs text-slate-400">
                {providers.includes("google") ? "Signed in with Google — email can't be changed here." : "Your account email."}
              </p>
            </div>

            {/* Username */}
            <div>
              <label htmlFor="settings-username" className="mb-1.5 block text-sm font-medium text-slate-700">
                Username
              </label>
              <input
                id="settings-username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                minLength={3}
                className="w-full rounded-lg border border-slate-300 px-4 py-2.5 outline-none transition focus:border-slate-900"
              />
              <p className="mt-1 text-xs text-slate-400">
                Used to log in. Letters, numbers, underscores, dots and hyphens.
              </p>
            </div>

            {/* Name */}
            <div>
              <label htmlFor="settings-name" className="mb-1.5 block text-sm font-medium text-slate-700">
                Display name
              </label>
              <input
                id="settings-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full rounded-lg border border-slate-300 px-4 py-2.5 outline-none transition focus:border-slate-900"
              />
            </div>

            {/* Role */}
            <div>
              <label htmlFor="settings-role" className="mb-1.5 block text-sm font-medium text-slate-700">
                Account type
              </label>
              <select
                id="settings-role"
                value={role}
                onChange={(e) => setRole(e.target.value as "student" | "employee" | "employer")}
                className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 outline-none transition focus:border-slate-900"
              >
                <option value="student">Student</option>
                <option value="employee">Employee</option>
                <option value="employer">Employer</option>
              </select>
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleSaveProfile}
                disabled={isPending}
                className="rounded-lg bg-slate-900 px-6 py-2.5 font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isPending ? "Saving..." : "Save changes"}
              </button>
            </div>
          </div>
        )}

        {/* Password tab */}
        {activeTab === "password" && (
          <div className="space-y-5">
            {providers.includes("google") && (
              <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
                This account was created with Google sign-in. To log in with a username and password, set a password below. You can then sign in with either Google or username + password.
              </div>
            )}

            <div>
              <label htmlFor="settings-current-pw" className="mb-1.5 block text-sm font-medium text-slate-700">
                Current password
              </label>
              <input
                id="settings-current-pw"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
                className="w-full rounded-lg border border-slate-300 px-4 py-2.5 outline-none transition focus:border-slate-900"
                placeholder="Enter current password"
              />
            </div>

            <div>
              <label htmlFor="settings-new-pw" className="mb-1.5 block text-sm font-medium text-slate-700">
                New password
              </label>
              <input
                id="settings-new-pw"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={6}
                className="w-full rounded-lg border border-slate-300 px-4 py-2.5 outline-none transition focus:border-slate-900"
              />
            </div>

            <div>
              <label htmlFor="settings-confirm-pw" className="mb-1.5 block text-sm font-medium text-slate-700">
                Confirm new password
              </label>
              <input
                id="settings-confirm-pw"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={6}
                className="w-full rounded-lg border border-slate-300 px-4 py-2.5 outline-none transition focus:border-slate-900"
              />
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleSavePassword}
                disabled={isPending}
                className="rounded-lg bg-slate-900 px-6 py-2.5 font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isPending ? "Saving..." : "Update password"}
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
