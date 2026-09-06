"use client";

import { useMemo } from "react";

interface ExpenseBreakdownProps {
  expensesByCategory: { name: string; color: string; amount: number }[];
}

export default function ExpenseBreakdown({
  expensesByCategory,
}: ExpenseBreakdownProps) {
  const sorted = useMemo(
    () =>
      [...expensesByCategory]
        .filter((c) => c.amount > 0)
        .sort((a, b) => b.amount - a.amount),
    [expensesByCategory]
  );

  const total = useMemo(
    () => sorted.reduce((sum, c) => sum + c.amount, 0),
    [sorted]
  );

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6">
      <div>
        <h2 className="text-lg font-semibold text-slate-950">
          Spending Breakdown
        </h2>
        <p className="mt-0.5 text-xs text-slate-500">This month&apos;s expenses</p>
      </div>

      {sorted.length === 0 ? (
        <div className="py-8 text-center">
          <p className="text-sm text-slate-500">
            No expenses recorded this month.
          </p>
        </div>
      ) : (
        <>
          {/* Donut-style summary */}
          <div className="mt-5 flex items-center gap-6">
            {/* Stacked bar */}
            <div className="h-4 flex-1 overflow-hidden rounded-full bg-slate-100">
              {sorted.map((cat, i) => (
                <div
                  key={cat.name}
                  className="h-full float-left transition-all"
                  style={{
                    width: `${(cat.amount / total) * 100}%`,
                    backgroundColor: cat.color,
                    opacity: 1 - i * 0.05,
                  }}
                  title={`${cat.name}: ₹${cat.amount.toLocaleString("en-IN")}`}
                />
              ))}
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-slate-950">
                ₹{total.toLocaleString("en-IN")}
              </p>
              <p className="text-xs text-slate-500">total spent</p>
            </div>
          </div>

          {/* Category list */}
          <div className="mt-5 space-y-2.5">
            {sorted.slice(0, 6).map((cat) => {
              const pct = Math.round((cat.amount / total) * 100);
              return (
                <div key={cat.name} className="flex items-center gap-3">
                  <div
                    className="h-3 w-3 flex-shrink-0 rounded-full"
                    style={{ backgroundColor: cat.color }}
                  />
                  <span className="min-w-0 flex-1 truncate text-sm text-slate-700">
                    {cat.name}
                  </span>
                  <span className="text-xs text-slate-500">{pct}%</span>
                  <span className="w-24 text-right text-sm font-medium text-slate-950">
                    ₹{cat.amount.toLocaleString("en-IN")}
                  </span>
                </div>
              );
            })}
          </div>

          {sorted.length > 6 && (
            <p className="mt-3 text-center text-xs text-slate-400">
              +{sorted.length - 6} more categories
            </p>
          )}
        </>
      )}
    </div>
  );
}
