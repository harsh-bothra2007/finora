"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  createTransaction,
  deleteTransaction,
} from "@/lib/supabase/queries";
import type {
  TransactionWithCategory,
  Category,
  PaymentMethod,
} from "@/lib/types/database";
import { PAYMENT_METHODS } from "@/lib/types/database";
import AddTransactionModal from "@/components/AddTransactionModal";

interface DashboardClientProps {
  initialTransactions: TransactionWithCategory[];
  categories: Category[];
  summary: {
    totalBalance: number;
    totalIncome: number;
    totalExpenses: number;
  };
}

export default function DashboardClient({
  initialTransactions,
  categories,
  summary,
}: DashboardClientProps) {
  const router = useRouter();
  const [transactions, setTransactions] = useState(initialTransactions);
  const [showAddModal, setShowAddModal] = useState(false);
  const [filterType, setFilterType] = useState<"all" | "income" | "expense">(
    "all"
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Live balance calculation
  const liveSummary = useMemo(() => {
    let income = 0;
    let expenses = 0;
    for (const tx of transactions) {
      if (tx.type === "income") income += tx.amount;
      else expenses += tx.amount;
    }
    return { totalBalance: income - expenses, totalIncome: income, totalExpenses: expenses };
  }, [transactions]);

  // Filtered + searched transactions
  const filteredTransactions = useMemo(() => {
    let result = transactions;

    if (filterType !== "all") {
      result = result.filter((tx) => tx.type === filterType);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (tx) =>
          tx.name.toLowerCase().includes(q) ||
          tx.categories?.name?.toLowerCase().includes(q) ||
          tx.notes.toLowerCase().includes(q)
      );
    }

    return result;
  }, [transactions, filterType, searchQuery]);

  async function handleAdd(data: {
    name: string;
    amount: number;
    type: "income" | "expense";
    category_id: string;
    payment_method: PaymentMethod;
    date: string;
    notes: string;
  }) {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    const newTx = await createTransaction({
      user_id: user.id,
      ...data,
    });

    // Prepend to local state for instant UI update
    setTransactions((prev) => [newTx, ...prev]);
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    try {
      await deleteTransaction(id);
      setTransactions((prev) => prev.filter((tx) => tx.id !== id));
    } catch {
      // Re-fetch on error to stay in sync
      router.refresh();
    } finally {
      setDeletingId(null);
    }
  }

  function formatDate(dateStr: string) {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
  }

  return (
    <>
      {/* ── Balance Overview ── */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/60">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-500">Total Balance</p>
            <p className="mt-1 text-4xl font-bold text-slate-950">
              ₹{liveSummary.totalBalance.toLocaleString("en-IN")}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            + Add Transaction
          </button>
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
              <p className="text-sm text-slate-500">Total Income</p>
            </div>
            <p className="mt-3 text-2xl font-semibold text-emerald-600">
              +₹{liveSummary.totalIncome.toLocaleString("en-IN")}
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
              <p className="text-sm text-slate-500">Total Expenses</p>
            </div>
            <p className="mt-3 text-2xl font-semibold text-red-500">
              -₹{liveSummary.totalExpenses.toLocaleString("en-IN")}
            </p>
          </div>
        </div>
      </div>

      {/* ── Transactions ── */}
      <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-6">
        {/* Header + search/filter */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-lg font-semibold text-slate-950">Transactions</h2>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            {/* Search */}
            <div className="relative">
              <svg
                className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
                />
              </svg>
              <input
                type="text"
                placeholder="Search transactions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-slate-50 py-2 pl-10 pr-4 text-sm outline-none transition focus:border-slate-900 focus:bg-white sm:w-64"
              />
            </div>

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
          </div>
        </div>

        {/* Table header */}
        <div className="mt-6 hidden grid-cols-13 gap-4 border-b border-slate-100 pb-3 text-xs font-medium uppercase tracking-wider text-slate-400 sm:grid">
          <div className="col-span-3">Transaction</div>
          <div className="col-span-2">Category</div>
          <div className="col-span-2 text-center">Payment</div>
          <div className="col-span-2 text-right">Date</div>
          <div className="col-span-2 text-right">Amount</div>
          <div className="col-span-1" />
        </div>

        {/* Transaction rows */}
        {filteredTransactions.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-sm text-slate-500">
              {transactions.length === 0
                ? "No transactions yet. Click \"Add Transaction\" to get started."
                : "No transactions match your search."}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredTransactions.map((tx) => (
              <div
                key={tx.id}
                className="grid grid-cols-13 items-center gap-4 py-4"
              >
                {/* Name */}
                <div className="col-span-3">
                  <p className="text-sm font-medium text-slate-950">
                    {tx.name}
                  </p>
                  {tx.notes && (
                    <p className="mt-0.5 text-xs text-slate-400 truncate">
                      {tx.notes}
                    </p>
                  )}
                </div>

                {/* Category */}
                <div className="col-span-2">
                  {tx.categories ? (
                    <span
                      className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium"
                      style={{
                        backgroundColor: `${tx.categories.color}15`,
                        color: tx.categories.color,
                      }}
                    >
                      {tx.categories.name}
                    </span>
                  ) : (
                    <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-500">
                      Uncategorized
                    </span>
                  )}
                </div>

                {/* Payment Method */}
                <div className="col-span-2 text-center">
                  <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-600">
                    {PAYMENT_METHODS.find((pm) => pm.value === tx.payment_method)?.icon ?? "📎"}
                    {PAYMENT_METHODS.find((pm) => pm.value === tx.payment_method)?.label ?? tx.payment_method}
                  </span>
                </div>

                {/* Date */}
                <div className="col-span-2 text-right">
                  <span className="text-sm text-slate-500">
                    {formatDate(tx.date)}
                  </span>
                </div>

                {/* Amount */}
                <div className="col-span-2 text-right">
                  <span
                    className={`text-sm font-semibold ${
                      tx.type === "income"
                        ? "text-emerald-600"
                        : "text-red-500"
                    }`}
                  >
                    {tx.type === "income" ? "+" : "-"}₹
                    {tx.amount.toLocaleString("en-IN")}
                  </span>
                </div>

                {/* Delete */}
                <div className="col-span-1 text-right">
                  <button
                    type="button"
                    onClick={() => handleDelete(tx.id)}
                    disabled={deletingId === tx.id}
                    className="rounded p-1 text-slate-300 transition hover:bg-red-50 hover:text-red-500 disabled:opacity-40"
                    title="Delete transaction"
                  >
                    {deletingId === tx.id ? (
                      <svg
                        className="h-4 w-4 animate-spin"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                        />
                      </svg>
                    ) : (
                      <svg
                        className="h-4 w-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={2}
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
                        />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Count */}
        {filteredTransactions.length > 0 && (
          <div className="mt-4 border-t border-slate-100 pt-4 text-center text-xs text-slate-400">
            Showing {filteredTransactions.length} of {transactions.length}{" "}
            transactions
          </div>
        )}
      </div>

      {/* ── Add Modal ── */}
      <AddTransactionModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSubmit={handleAdd}
        categories={categories}
      />
    </>
  );
}
