"use client";

import { useMemo, useState } from "react";
import EmptyState from "@/components/EmptyState";

type Period = "weekly" | "monthly" | "yearly";

interface MonthlyChartProps {
  data: { month: string; income: number; expenses: number }[];
}

const MONTH_LABELS: Record<string, string> = {
  "01": "Jan", "02": "Feb", "03": "Mar", "04": "Apr",
  "05": "May", "06": "Jun", "07": "Jul", "08": "Aug",
  "09": "Sep", "10": "Oct", "11": "Nov", "12": "Dec",
};

function inr(n: number): string {
  return `₹${Math.round(n).toLocaleString("en-IN")}`;
}

export default function MonthlyChart({ data }: MonthlyChartProps) {
  const [period, setPeriod] = useState<Period>("monthly");
  const [hoveredMonth, setHoveredMonth] = useState<string | null>(null);

  const maxValue = useMemo(() => {
    let max = 0;
    for (const d of data) {
      if (d.income > max) max = d.income;
      if (d.expenses > max) max = d.expenses;
    }
    return max || 1;
  }, [data]);

  const totalIncome = data.reduce((s, d) => s + d.income, 0);
  const totalExpenses = data.reduce((s, d) => s + d.expenses, 0);
  const hasData = data.some((d) => d.income > 0 || d.expenses > 0);
  const avgIncome = data.length ? totalIncome / data.length : 0;
  const avgExpenses = data.length ? totalExpenses / data.length : 0;
  const avgNet = avgIncome - avgExpenses;

  const hovered = hoveredMonth
    ? data.find((d) => d.month === hoveredMonth)
    : null;

  function monthName(monthKey: string) {
    const m = MONTH_LABELS[monthKey.slice(5, 7)] || monthKey.slice(5, 7);
    if (period === "yearly") return monthKey.slice(0, 4);
    return m;
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      {/* Header */}
      <div className="flex flex-col justify-between gap-3 border-b border-slate-100 pb-4 sm:flex-row sm:items-center">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">
            Income vs Expenses Analysis
          </h3>
          <p className="text-xs font-normal text-slate-400">
            Past 6 calendar months
          </p>
        </div>
        <div className="flex items-center gap-0.5 self-start rounded-lg border border-slate-200/70 bg-slate-100 p-0.5 text-xs">
          {(["weekly", "monthly", "yearly"] as const).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPeriod(p)}
              className={`rounded px-2.5 py-1 font-medium capitalize transition ${
                period === p
                  ? "border border-slate-200/80 bg-white text-slate-900 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {!hasData && (
        <EmptyState
          compact
          title="No chart data yet"
          description="Add your first income or expense — your 6-month trend will appear here automatically."
          actionHref="/dashboard/transactions"
          actionLabel="Add transaction"
        />
      )}

      {hasData && (
        <>
      {/* Run-rate benchmarks */}
      <div className="my-2 grid grid-cols-3 gap-3 rounded-lg border border-slate-100 bg-slate-50 px-3 py-3 text-center">
        <div>
          <div className="text-[10px] font-medium uppercase tracking-wider text-slate-400">
            Avg Income
          </div>
          <div className="mt-0.5 font-mono text-xs font-semibold text-slate-900">
            {inr(avgIncome)}
          </div>
        </div>
        <div className="border-x border-slate-200">
          <div className="text-[10px] font-medium uppercase tracking-wider text-slate-400">
            Avg Expenses
          </div>
          <div className="mt-0.5 font-mono text-xs font-semibold text-slate-900">
            {inr(avgExpenses)}
          </div>
        </div>
        <div>
          <div className="text-[10px] font-medium uppercase tracking-wider text-slate-400">
            Avg Net Savings
          </div>
          <div className="mt-0.5 font-mono text-xs font-semibold text-brand-600">
            {inr(avgNet)}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-end gap-4 pb-1 pt-1 text-xs font-medium text-slate-500">
        <div className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-brand-600" />
          <span>Income</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-slate-300" />
          <span>Expenses</span>
        </div>
      </div>

      {/* Chart */}
      <div className="relative h-56 select-none pt-4">
        {/* Gridlines */}
        <div className="pointer-events-none absolute inset-0 flex flex-col justify-between font-mono text-[10px] text-slate-400">
          {[0, 1, 2, 3, 4].map((i) => {
            const val = (maxValue * (4 - i)) / 4;
            return (
              <div
                key={i}
                className={`flex w-full justify-between border-b border-dashed ${
                  i === 4 ? "border-slate-200" : "border-slate-100"
                }`}
              >
                <span>
                  {val >= 1000
                    ? `₹${(val / 1000).toFixed(0)}k`
                    : `₹${Math.round(val).toLocaleString("en-IN")}`}
                </span>
              </div>
            );
          })}
        </div>

        <div className="relative z-10 flex h-full items-end justify-between px-4 pb-2">
          {data.map((d, idx) => {
            const isLast = idx === data.length - 1;
            const isHovered = hoveredMonth === d.month;
            const incomeH = Math.max((d.income / maxValue) * 100, d.income > 0 ? 3 : 0);
            const expenseH = Math.max((d.expenses / maxValue) * 100, d.expenses > 0 ? 3 : 0);
            return (
              <div key={d.month} className="flex flex-col items-center gap-1.5">
                <div
                  className="relative flex h-36 items-end gap-1"
                  onMouseEnter={() => setHoveredMonth(d.month)}
                  onMouseLeave={() => setHoveredMonth(null)}
                >
                  {isLast && isHovered && (
                    <div className="absolute -top-7 left-1/2 z-20 -translate-x-1/2 whitespace-nowrap rounded bg-slate-900 px-1.5 py-0.5 font-mono text-[10px] text-white">
                      +{inr(d.income - d.expenses)}
                    </div>
                  )}
                  <div
                    className={`w-2.5 rounded-t-sm transition-colors ${
                      isHovered ? "bg-brand-500" : "bg-brand-600"
                    } ${isLast ? "bg-brand-600" : "bg-brand-600/80"}`}
                    style={{ height: `${incomeH}%` }}
                    title={`Income: ${inr(d.income)}`}
                  />
                  <div
                    className={`w-2.5 rounded-t-sm transition-colors ${
                      isHovered ? "bg-slate-400" : isLast ? "bg-slate-400" : "bg-slate-300"
                    }`}
                    style={{ height: `${expenseH}%` }}
                    title={`Expenses: ${inr(d.expenses)}`}
                  />
                </div>
                <span
                  className={`text-[11px] font-medium ${
                    isLast ? "font-semibold text-slate-900" : "text-slate-600"
                  }`}
                >
                  {monthName(d.month)}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {hovered && (
        <div className="mt-2 flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-4 py-2 text-xs">
          <span className="font-medium text-slate-700">
            {MONTH_LABELS[hovered.month.slice(5, 7)]} {hovered.month.slice(0, 4)}
          </span>
          <div className="flex gap-4 font-mono">
            <span className="text-emerald-600">+{inr(hovered.income)}</span>
            <span className="text-slate-500">-{inr(hovered.expenses)}</span>
            <span className="font-semibold text-slate-900">
              Net {inr(hovered.income - hovered.expenses)}
            </span>
          </div>
        </div>
      )}
      </>
      )}
    </div>
  );
}
