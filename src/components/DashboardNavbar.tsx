"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

interface DashboardNavbarProps {
  userName: string;
  title?: string;
}

export default function DashboardNavbar({
  userName,
  title = "Dashboard",
}: DashboardNavbarProps) {
  const router = useRouter();

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-30 flex h-16 flex-shrink-0 items-center justify-between border-b border-slate-200 bg-white px-6">
      <div className="flex items-center gap-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-sm font-semibold tracking-tight text-slate-900">
              {title}
            </h1>
            <span className="rounded border border-slate-200 bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600">
              Personal
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="hidden items-center gap-1.5 text-xs text-slate-500 sm:flex">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          <span>Your financial data is up to date</span>
        </div>

        <div className="flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700">
          ₹ INR
        </div>

        <div className="flex items-center gap-2 pl-1">
          <Link
            href="/dashboard/settings"
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50"
          >
            Settings
          </Link>
          <div className="flex items-center gap-2 rounded-md border border-transparent p-1 pl-1.5 pr-2 transition-colors">
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-900 text-[11px] font-bold text-white">
              {userName.charAt(0).toUpperCase()}
            </div>
            <span className="text-xs font-medium text-slate-700">
              {userName.split(" ")[0]}
            </span>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50"
          >
            Logout
          </button>
        </div>
      </div>
    </header>
  );
}