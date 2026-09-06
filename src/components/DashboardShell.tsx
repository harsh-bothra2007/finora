"use client";

import Link from "next/link";
import { useState } from "react";
import Sidebar from "./Sidebar";

interface DashboardShellProps {
  children: React.ReactNode;
  userName?: string;
  userEmail?: string;
}

export default function DashboardShell({
  children,
  userName,
  userEmail,
}: DashboardShellProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-[#F8FAFC]">
      {/* Mobile top bar */}
      <header className="flex h-14 flex-shrink-0 items-center justify-between border-b border-slate-200 bg-white px-4 md:hidden">
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-md bg-brand-600 text-xs font-bold text-white">
            F
          </div>
          <span className="text-sm font-bold tracking-tight text-slate-950">
            Finora
          </span>
        </div>
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Open menu"
          className="rounded-lg border border-slate-200 p-1.5 text-slate-600 transition hover:bg-slate-50"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </header>

      {/* Body row: sidebar + content */}
      <div className="flex min-h-0 flex-1">
        {/* Desktop sidebar */}
        <div className="hidden h-full flex-shrink-0 md:block">
          <Sidebar userName={userName} userEmail={userEmail} />
        </div>

        {/* Mobile drawer */}
        {open && (
          <div className="fixed inset-0 z-50 md:hidden">
            <div
              className="absolute inset-0 bg-slate-950/40"
              onClick={() => setOpen(false)}
              aria-hidden
            />
            <div className="absolute inset-y-0 left-0 flex shadow-xl">
              <Sidebar
                userName={userName}
                userEmail={userEmail}
                onNavigate={() => setOpen(false)}
              />
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close menu"
                className="ml-2 mt-4 h-8 w-8 rounded-full bg-white/90 text-slate-600 shadow"
              >
                <svg className="mx-auto h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        )}

        {/* Content column — this is the only thing that scrolls */}
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto">{children}</div>
        </div>
      </div>
    </div>
  );
}
