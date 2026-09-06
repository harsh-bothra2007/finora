"use client";

import { useMemo } from "react";
import EmptyState from "@/components/EmptyState";

interface ExpenseBreakdownProps {
  expensesByCategory: { name: string; color: string; amount: number }[];
}

function inr(n: number): string {
  return `₹${Math.round(n).toLocaleString("en-IN")}`;
}

// Restrained palette: brand indigo for the top slice, then slate shades.
const PALETTE = ["#4F46E5", "#334155", "#64748B", "#94A3B8", "#CBD5E1", "#E2E8F0"];

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

  const total = useMemo(() => sorted.reduce((s, c) => s + c.amount, 0), [sorted]);

  // Donut: circumference = 2 * pi * 38 ≈ 238.76
  const CIRC = 2 * Math.PI * 38;
  const segments = useMemo(() => {
    let offset = 0;
    return sorted.map((cat, idx) => {
      const len = total > 0 ? (cat.amount / total) * CIRC : 0;
      const seg = { name: cat.name, amount: cat.amount, len, offset, color: PALETTE[idx % PALETTE.length] };
      offset -= len;
      return seg;
    });
  }, [sorted, total, CIRC]);

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">Spending Breakdown</h3>
          <p className="text-xs text-slate-400">
            Categorical distribution this month
          </p>
        </div>
        {total > 0 && (
          <span className="font-mono text-xs font-medium tabular-nums text-slate-700">
            {inr(total)}
          </span>
        )}
      </div>

      {segments.length === 0 ? (
        <EmptyState
          title="No spending this month"
          description="Expenses you add will be broken down by category here."
          actionHref="/dashboard/transactions"
          actionLabel="Add expense"
          compact
        />
      ) : (
        <>
          {/* Donut */}
          <div className="relative my-4 flex items-center justify-center">
            <svg className="h-40 w-40 -rotate-90" viewBox="0 0 100 100">
              <circle
                cx="50"
                cy="50"
                r="38"
                fill="transparent"
                stroke="#F1F5F9"
                strokeWidth="9"
              />
              {segments.map((seg) => (
                <circle
                  key={seg.name}
                  cx="50"
                  cy="50"
                  r="38"
                  fill="transparent"
                  stroke={seg.color}
                  strokeDasharray={`${seg.len} ${CIRC - seg.len}`}
                  strokeDashoffset={seg.offset}
                  strokeWidth="9"
                >
                  <title>{`${seg.name}: ${inr(seg.amount)}`}</title>
                </circle>
              ))}
            </svg>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-[10px] font-medium uppercase tracking-wider text-slate-400">
                Total Spent
              </span>
              <span className="font-mono text-base font-bold tracking-tight tabular-nums text-slate-900">
                {inr(total)}
              </span>
            </div>
          </div>

          {/* Ranked list */}
          <div className="space-y-2 pt-1">
            {segments.slice(0, 6).map((seg) => {
              const pct = total > 0 ? Math.round((seg.amount / total) * 100) : 0;
              return (
                <div key={seg.name} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: seg.color }}
                    />
                    <span className="font-medium text-slate-700">{seg.name}</span>
                  </div>
                  <div className="flex items-center gap-2 font-mono tabular-nums">
                    <span className="text-[11px] text-slate-400">{pct}%</span>
                    <span className="font-medium text-slate-900">
                      {inr(seg.amount)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
