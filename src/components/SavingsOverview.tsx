"use client";

import type { SavingsGoal } from "@/lib/types/database";

interface SavingsOverviewProps {
  goals: SavingsGoal[];
}

export default function SavingsOverview({ goals }: SavingsOverviewProps) {
  const totalSaved = goals.reduce((sum, g) => sum + g.current_amount, 0);
  const totalTarget = goals.reduce((sum, g) => sum + g.target_amount, 0);
  const overallPercentage =
    totalTarget > 0 ? Math.min(Math.round((totalSaved / totalTarget) * 100), 100) : 0;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-950">
            Savings Goals
          </h2>
          <p className="mt-0.5 text-xs text-slate-500">
            {goals.length} goal{goals.length !== 1 ? "s" : ""} active
          </p>
        </div>
        <a
          href="/dashboard/savings"
          className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50"
        >
          Manage →
        </a>
      </div>

      {goals.length === 0 ? (
        <div className="py-8 text-center">
          <p className="text-sm text-slate-500">
            No savings goals yet. Create one to start tracking.
          </p>
        </div>
      ) : (
        <>
          {/* Overall progress */}
          <div className="mt-5">
            <div className="mb-2 flex justify-between text-sm">
              <span className="text-slate-600">
                ₹{totalSaved.toLocaleString("en-IN")} saved
              </span>
              <span className="text-slate-500">
                ₹{totalTarget.toLocaleString("en-IN")}
              </span>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-slate-900 transition-all duration-500"
                style={{ width: `${overallPercentage}%` }}
              />
            </div>
            <p className="mt-1.5 text-right text-xs text-slate-400">
              {overallPercentage}% overall
            </p>
          </div>

          {/* Individual goals */}
          <div className="mt-5 space-y-3">
            {goals.slice(0, 3).map((goal) => {
              const pct = Math.min(
                Math.round((goal.current_amount / goal.target_amount) * 100),
                100
              );
              return (
                <div key={goal.id}>
                  <div className="mb-1.5 flex justify-between text-xs">
                    <span className="font-medium text-slate-700">
                      {goal.name}
                    </span>
                    <span className="text-slate-500">
                      {pct}%
                    </span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className={`h-full rounded-full transition-all ${
                        pct >= 100 ? "bg-emerald-500" : "bg-slate-600"
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
            {goals.length > 3 && (
              <p className="text-center text-xs text-slate-400">
                +{goals.length - 3} more goal{goals.length - 3 !== 1 ? "s" : ""}
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
