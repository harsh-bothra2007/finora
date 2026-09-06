"use client";

import { useState, useMemo } from "react";
import type {
  TransactionWithCategory,
  Category,
  CustomPaymentMethod,
} from "@/lib/types/database";
import { resolvePaymentMethod } from "@/lib/types/database";
import EmptyState from "@/components/EmptyState";

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

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function DashboardClient({
  initialTransactions,
  customPaymentMethods = [],
}: DashboardClientProps) {
  const [filterType, setFilterType] = useState<"all" | "income" | "expense">(
    "all"
  );

  const filtered = useMemo(() => {
    let result = initialTransactions.slice(0, 8);
    if (filterType !== "all") {
      result = result.filter((tx) => tx.type === filterType);
    }
    return result;
  }, [initialTransactions, filterType]);

  function initials(name: string) {
    return name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0].toUpperCase())
      .join("");
  }

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-100 p-4">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">Recent Activity</h3>
          <p className="text-xs text-slate-400">Latest recorded transactions</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-0.5 rounded-md bg-slate-100 p-0.5 text-xs">
            {(["all", "income", "expense"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setFilterType(t)}
                className={`rounded px-2 py-0.5 font-medium capitalize transition ${
                  filterType === t
                    ? "bg-white text-slate-800 shadow-sm"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
          <a
            href="/dashboard/transactions"
            className="ml-2 text-xs font-medium text-brand-600 hover:text-brand-700"
          >
            View all →
          </a>
        </div>
      </div>

      {filtered.length === 0 ? (
        initialTransactions.length === 0 ? (
          <EmptyState
            compact
            title="No transactions yet"
            description="Add your first income or expense to see it here."
            actionHref="/dashboard/transactions"
            actionLabel="Add transaction"
          />
        ) : (
          <EmptyState
            title="No transactions match this filter"
            description="Try switching to a different tab."
            compact
          />
        )
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/50 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                <th className="px-4 py-2.5">Description</th>
                <th className="px-3 py-2.5">Category</th>
                <th className="px-3 py-2.5">Date</th>
                <th className="px-3 py-2.5">Payment Method</th>
                <th className="px-4 py-2.5 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
              {filtered.map((tx) => {
                const pm = resolvePaymentMethod(tx.payment_method, customPaymentMethods);
                const isIncome = tx.type === "income";
                return (
                  <tr key={tx.id} className="transition-colors hover:bg-slate-50/70">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md border border-slate-200/80 bg-slate-100 text-xs font-semibold text-slate-600">
                          {initials(tx.name) || "TX"}
                        </div>
                        <span className="font-medium text-slate-900">{tx.name}</span>
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      {tx.categories ? (
                        <span
                          className="inline-flex rounded px-1.5 py-0.5 text-[10px] font-medium"
                          style={{
                            backgroundColor: `${tx.categories.color}15`,
                            color: tx.categories.color,
                          }}
                        >
                          {tx.categories.name}
                        </span>
                      ) : (
                        <span className="inline-flex rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-600">
                          Uncategorized
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-[11px] text-slate-400">
                      {formatDate(tx.date)}
                    </td>
                    <td className="px-3 py-3 text-[11px] text-slate-500">
                      <span className="mr-1">{pm.icon}</span>
                      {pm.label}
                    </td>
                    <td
                      className={`px-4 py-3 text-right font-mono font-medium tabular-nums ${
                        isIncome ? "text-emerald-600" : "text-slate-900"
                      }`}
                    >
                      {isIncome ? "+" : "-"}₹{tx.amount.toLocaleString("en-IN")}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
