"use client";

import { useState, useMemo } from "react";
import type {
  TransactionWithCategory,
  Category,
  CustomPaymentMethod,
} from "@/lib/types/database";
import { resolvePaymentMethod } from "@/lib/types/database";

interface DashboardClientProps {
  initialTransactions: TransactionWithCategory[];
  categories: Category[];
  customPaymentMethods?: CustomPaymentMethod[];
  summary: {
    totalBalance: number;
    totalIncome: number;
    totalExpenses: number;
  };
}

export default function DashboardClient({
  initialTransactions,
  summary,
  customPaymentMethods = [],
}: DashboardClientProps) {
  const [filterType, setFilterType] = useState<"all" | "income" | "expense">(
    "all"
  );

  // Show only recent 8 transactions on dashboard (read-only)
  const recentTransactions = useMemo(() => {
    let result = initialTransactions.slice(0, 8);
    if (filterType !== "all") {
      result = result.filter((tx) => tx.type === filterType);
    }
    return result;
  }, [initialTransactions, filterType]);

  function formatDate(dateStr: string) {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
  }

  return (
    <>
      {/* ── Balance Overview ── */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/60">
        <div>
          <p className="text-sm text-slate-500">Total Balance</p>
          <p className="mt-1 text-4xl font-bold text-slate-950">
            ₹{summary.totalBalance.toLocaleString("en-IN")}
          </p>
        </div>

        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="rounded-xl bg-slate-50 p-4">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100">
                <svg
                  className="h-4 w-4 text-emerald-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M4.5 19.5l15-15m0 0H8.25m11.25 0v11.25"
                  />
                </svg>
              </div>
              <p className="text-sm text-slate-500">This Month&apos;s Income</p>
            </div>
            <p className="mt-3 text-2xl font-semibold text-emerald-600">
              +₹{summary.totalIncome.toLocaleString("en-IN")}
            </p>
          </div>

          <div className="rounded-xl bg-slate-50 p-4">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-100">
                <svg
                  className="h-4 w-4 text-red-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M4.5 4.5l15 15m0 0V8.25m0 11.25H8.25"
                  />
                </svg>
              </div>
              <p className="text-sm text-slate-500">This Month&apos;s Expenses</p>
            </div>
            <p className="mt-3 text-2xl font-semibold text-red-500">
              -₹{summary.totalExpenses.toLocaleString("en-IN")}
            </p>
          </div>
        </div>
      </div>

      {/* ── Recent Transactions (read-only) ── */}
      <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-950">
              Recent Transactions
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Last 8 transactions
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Type filter */}
            <div className="flex gap-1 rounded-lg bg-slate-100 p-1">
              {(["all", "income", "expense"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setFilterType(t)}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium capitalize transition ${
                    filterType === t
                      ? "bg-white text-slate-900 shadow-sm"
                      : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
            <a
              href="/dashboard/transactions"
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50"
            >
              View all →
            </a>
          </div>
        </div>

        {recentTransactions.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-sm text-slate-500">
              {initialTransactions.length === 0
                ? "No transactions yet."
                : "No transactions match this filter."}
            </p>
          </div>
        ) : (
          <div className="mt-4 divide-y divide-slate-100">
            {recentTransactions.map((tx) => (
              <div
                key={tx.id}
                className="flex items-center gap-4 py-3.5"
              >
                {/* Category color dot */}
                <div
                  className="h-2.5 w-2.5 flex-shrink-0 rounded-full"
                  style={{ backgroundColor: tx.categories?.color ?? "#cbd5e1" }}
                />

                {/* Name + notes */}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-slate-950">{tx.name}</p>
                  {tx.notes && (
                    <p className="mt-0.5 truncate text-xs text-slate-400">
                      {tx.notes}
                    </p>
                  )}
                </div>

                {/* Category badge */}
                {tx.categories && (
                  <span
                    className="hidden rounded-full px-2 py-0.5 text-[11px] font-medium sm:inline-block"
                    style={{
                      backgroundColor: `${tx.categories.color}15`,
                      color: tx.categories.color,
                    }}
                  >
                    {tx.categories.name}
                  </span>
                )}

                {/* Payment method */}
                <span className="hidden items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-500 md:inline-flex">
                  {resolvePaymentMethod(tx.payment_method, customPaymentMethods).icon}
                </span>

                {/* Date */}
                <span className="text-xs text-slate-400">
                  {formatDate(tx.date)}
                </span>

                {/* Amount */}
                <span
                  className={`w-24 text-right text-sm font-semibold ${
                    tx.type === "income" ? "text-emerald-600" : "text-red-500"
                  }`}
                >
                  {tx.type === "income" ? "+" : "-"}₹
                  {tx.amount.toLocaleString("en-IN")}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
