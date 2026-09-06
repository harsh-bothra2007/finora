"use client";

import type { SavingsGoal } from "@/lib/types/database";

interface SavingsOverviewProps {
  goals: SavingsGoal[];
}

function inr(n: number): string {
  return `₹${Math.round(n).toLocaleString("en-IN")}`;
}

function formatTarget(date: string | null) {
  if (!date) return "No deadline";
  const d = new Date(date + "T00:00:00");
  const months = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ];
  return `Target: ${months[d.getMonth()]} ${d.getFullYear()}`;
}

export default function SavingsOverview({ goals }: SavingsOverviewProps) {
  return (
    <div className="space-y-3.5 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-100 pb-2">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">Savings Goals</h3>
          <p className="text-xs text-slate-400">
            {goals.length} active target{goals.length === 1 ? "" : "s"}
          </p>
        </div>
        <a
          href="/dashboard/savings"
          className="text-xs font-medium text-brand-600 hover:text-brand-700 hover:underline"
        >
          + New Goal
        </a>
      </div>

      {goals.length === 0 ? (
        <div className="py-8 text-center">
          <p className="text-sm text-slate-500">
            No savings goals yet. Create one to start tracking.
          </p>
        </div>
      ) : (
        goals.slice(0, 3).map((goal) => {
          const pct = Math.min(
            Math.round((goal.current_amount / goal.target_amount) * 100),
            100
          );
          return (
            <div key={goal.id} className="rounded-lg border border-slate-200 bg-slate-50/50 p-3">
              <div className="mb-1.5 flex items-center justify-between">
                <div>
                  <span className="block text-xs font-semibold leading-tight text-slate-900">
                    {goal.icon} {goal.name}
                  </span>
                  <span className="text-[10px] text-slate-400">
                    {formatTarget(goal.deadline)}
                  </span>
                </div>
                <span
                  className={`font-mono text-xs font-semibold ${
                    pct >= 100 ? "text-emerald-600" : "text-brand-600"
                  }`}
                >
                  {pct}%
                </span>
              </div>
              <div className="mb-1.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-200/80">
                <div
                  className={`h-full rounded-full ${
                    pct >= 100 ? "bg-emerald-500" : "bg-brand-600"
                  }`}
                  style={{ width: `${pct}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-mono text-slate-500">
                  {inr(goal.current_amount)} / {inr(goal.target_amount)}
                </span>
                <a
                  href="/dashboard/savings"
                  className="rounded border border-slate-200 bg-white px-2 py-0.5 text-[10px] font-medium text-slate-700 transition-colors hover:bg-slate-100"
                >
                  + Add Funds
                </a>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
