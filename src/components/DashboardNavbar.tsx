"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

interface DashboardNavbarProps {
  userName: string;
}

export default function DashboardNavbar({ userName }: DashboardNavbarProps) {
  const router = useRouter();

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/80 backdrop-blur-sm">
      <div className="flex h-16 items-center justify-end px-6 lg:px-8">
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-sm font-medium text-slate-950">
              {userName}
            </p>
          </div>
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-900 text-sm font-semibold text-white">
            {userName.charAt(0).toUpperCase()}
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
