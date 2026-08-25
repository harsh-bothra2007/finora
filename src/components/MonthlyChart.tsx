"use client";

import { useMemo } from "react";

interface MonthlyChartProps {
  data: { month: string; income: number; expenses: number }[];
}

const MONTH_LABELS: Record<string, string> = {
  "01": "Jan", "02": "Feb", "03": "Mar", "04": "Apr",
  "05": "May", "06": "Jun", "07": "Jul", "08": "Aug",
  "09": "Sep", "10": "Oct", "11": "Nov", "12": "Dec",
};

export default function MonthlyChart({ data }: MonthlyChartProps) {
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

  return (
    <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-950">
            Monthly Overview
          </h2>
          <p className="mt-0.5 text-xs text-slate-500">Last 6 months</p>
        </div>
        <div className="flex gap-4">
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-emerald-500" />
            <span className="text-xs text-slate-500">
              Income: ₹{totalIncome.toLocaleString("en-IN")}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-red-500" />
            <span className="text-xs text-slate-500">
              Expenses: ₹{totalExpenses.toLocaleString("en-IN")}
            </span>
          </div>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-6 gap-3">
        {data.map((d) => {
          const monthLabel = MONTH_LABELS[d.month.slice(5, 7)] || d.month.slice(5, 7);
          const incomeHeight = (d.income / maxValue) * 100;
          const expenseHeight = (d.expenses / maxValue) * 100;

          return (
            <div key={d.month} className="flex flex-col items-center">
              {/* Bars */}
              <div className="flex h-40 w-full items-end justify-center gap-1.5">
                <div
                  className="w-full max-w-[24px] rounded-t-md bg-emerald-500 transition-all duration-500"
                  style={{ height: `${incomeHeight}%`, minHeight: d.income > 0 ? "4px" : "0" }}
                  title={`Income: ₹${d.income.toLocaleString("en-IN")}`}
                />
                <div
                  className="w-full max-w-[24px] rounded-t-md bg-red-500 transition-all duration-500"
                  style={{ height: `${expenseHeight}%`, minHeight: d.expenses > 0 ? "4px" : "0" }}
                  title={`Expenses: ₹${d.expenses.toLocaleString("en-IN")}`}
                />
              </div>

              {/* Month label */}
              <p className="mt-2 text-xs font-medium text-slate-500">
                {monthLabel}
              </p>

              {/* Net */}
              <p className={`text-[10px] ${d.income - d.expenses >= 0 ? "text-slate-500" : "text-red-500"}`}>
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
