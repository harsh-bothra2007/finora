"use client";

import { useMemo, useState } from "react";

type Period = "monthly" | "weekly" | "yearly";

interface MonthlyChartProps {
  data: { month: string; income: number; expenses: number }[];
}

const MONTH_LABELS: Record<string, string> = {
  "01": "Jan", "02": "Feb", "03": "Mar", "04": "Apr",
  "05": "May", "06": "Jun", "07": "Jul", "08": "Aug",
  "09": "Sep", "10": "Oct", "11": "Nov", "12": "Dec",
};

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

  const totalIncome = data.reduce((sum, d) => sum + d.income, 0);
  const totalExpenses = data.reduce((sum, d) => sum + d.expenses, 0);
  const avgMonthlyIncome = data.length > 0 ? totalIncome / data.length : 0;
  const avgMonthlyExpenses = data.length > 0 ? totalExpenses / data.length : 0;

  function formatLabel(monthKey: string) {
    if (period === "yearly") return monthKey.slice(0, 4);
    const m = MONTH_LABELS[monthKey.slice(5, 7)] || monthKey.slice(5, 7);
    return period === "weekly" ? m : m;
  }

  const hovered = hoveredMonth ? data.find((d) => d.month === hoveredMonth) : null;

  return (
    <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-950">
            Income vs Expenses
          </h2>
          <p className="mt-0.5 text-xs text-slate-500">
            {period === "monthly" && "Last 6 months"}
            {period === "weekly" && "Last 6 months (monthly aggregation)"}
            {period === "yearly" && "Current year"}
          </p>
        </div>

        <div className="flex items-center gap-4">
          {/* Legend */}
          <div className="hidden gap-4 sm:flex">
            <div className="flex items-center gap-1.5">
              <div className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
              <span className="text-[11px] text-slate-500">Income</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="h-2.5 w-2.5 rounded-full bg-red-500" />
              <span className="text-[11px] text-slate-500">Expenses</span>
            </div>
          </div>

          {/* Period toggle */}
          <div className="flex gap-1 rounded-lg bg-slate-100 p-1">
            {(["weekly", "monthly", "yearly"] as const).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPeriod(p)}
                className={`rounded-md px-3 py-1.5 text-xs font-medium capitalize transition ${
                  period === p
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Summary stats */}
      <div className="mt-4 grid grid-cols-3 gap-4 rounded-xl bg-slate-50 p-3">
        <div className="text-center">
          <p className="text-[10px] font-medium uppercase tracking-wider text-slate-400">
            Avg Income
          </p>
          <p className="mt-0.5 text-sm font-semibold text-emerald-600">
            ₹{Math.round(avgMonthlyIncome).toLocaleString("en-IN")}
          </p>
        </div>
        <div className="text-center">
          <p className="text-[10px] font-medium uppercase tracking-wider text-slate-400">
            Avg Expenses
          </p>
          <p className="mt-0.5 text-sm font-semibold text-red-500">
            ₹{Math.round(avgMonthlyExpenses).toLocaleString("en-IN")}
          </p>
        </div>
        <div className="text-center">
          <p className="text-[10px] font-medium uppercase tracking-wider text-slate-400">
            Avg Savings
          </p>
          <p className={`mt-0.5 text-sm font-semibold ${avgMonthlyIncome - avgMonthlyExpenses >= 0 ? "text-slate-950" : "text-red-500"}`}>
            ₹{Math.round(avgMonthlyIncome - avgMonthlyExpenses).toLocaleString("en-IN")}
          </p>
        </div>
      </div>

      {/* Tooltip */}
      {hovered && (
        <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-700">
              {MONTH_LABELS[hovered.month.slice(5, 7)]} {hovered.month.slice(0, 4)}
            </span>
            <div className="flex gap-4">
              <span className="text-xs text-emerald-600">
                +₹{hovered.income.toLocaleString("en-IN")}
              </span>
              <span className="text-xs text-red-500">
                -₹{hovered.expenses.toLocaleString("en-IN")}
              </span>
              <span className={`text-xs font-medium ${hovered.income - hovered.expenses >= 0 ? "text-slate-950" : "text-red-500"}`}>
                Net ₹{(hovered.income - hovered.expenses).toLocaleString("en-IN")}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Chart */}
      <div className="mt-4 grid gap-3" style={{ gridTemplateColumns: `repeat(${data.length}, 1fr)` }}>
        {data.map((d) => {
          const label = formatLabel(d.month);
          const incomeHeight = (d.income / maxValue) * 100;
          const expenseHeight = (d.expenses / maxValue) * 100;
          const isHovered = hoveredMonth === d.month;

          return (
            <div
              key={d.month}
              className="flex flex-col items-center"
              onMouseEnter={() => setHoveredMonth(d.month)}
              onMouseLeave={() => setHoveredMonth(null)}
            >
              {/* Bars */}
              <div className="flex h-44 w-full items-end justify-center gap-1.5">
                <div
                  className={`w-full max-w-[28px] rounded-t-md transition-all duration-300 ${
                    isHovered ? "bg-emerald-400" : "bg-emerald-500"
                  }`}
                  style={{
                    height: `${incomeHeight}%`,
                    minHeight: d.income > 0 ? "4px" : "0",
                  }}
                  title={`Income: ₹${d.income.toLocaleString("en-IN")}`}
                />
                <div
                  className={`w-full max-w-[28px] rounded-t-md transition-all duration-300 ${
                    isHovered ? "bg-red-400" : "bg-red-500"
                  }`}
                  style={{
                    height: `${expenseHeight}%`,
                    minHeight: d.expenses > 0 ? "4px" : "0",
                  }}
                  title={`Expenses: ₹${d.expenses.toLocaleString("en-IN")}`}
                />
              </div>

              {/* Month label */}
              <p className={`mt-2 text-xs font-medium transition-colors ${
                isHovered ? "text-slate-950" : "text-slate-500"
              }`}>
                {label}
              </p>

              {/* Net */}
              <p
                className={`text-[10px] ${
                  d.income - d.expenses >= 0 ? "text-slate-500" : "text-red-500"
                }`}
              >
                {d.income - d.expenses >= 0 ? "+" : ""}
                ₹{(d.income - d.expenses).toLocaleString("en-IN")}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
