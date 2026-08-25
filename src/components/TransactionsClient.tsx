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

interface TransactionsClientProps {
  initialTransactions: TransactionWithCategory[];
  categories: Category[];
}

export default function TransactionsClient({
  initialTransactions,
  categories,
}: TransactionsClientProps) {
  const router = useRouter();
  const [transactions, setTransactions] = useState(initialTransactions);
  const [showAddModal, setShowAddModal] = useState(false);
  const [filterType, setFilterType] = useState<"all" | "income" | "expense">("all");
  const [filterPayment, setFilterPayment] = useState<PaymentMethod | "all">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const filteredTransactions = useMemo(() => {
    let result = transactions;

    if (filterType !== "all") {
      result = result.filter((tx) => tx.type === filterType);
    }

    if (filterPayment !== "all") {
      result = result.filter((tx) => tx.payment_method === filterPayment);
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
  }, [transactions, filterType, filterPayment, searchQuery]);

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

    setTransactions((prev) => [newTx, ...prev]);
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    try {
      await deleteTransaction(id);
      setTransactions((prev) => prev.filter((tx) => tx.id !== id));
    } catch {
      router.refresh();
    } finally {
      setDeletingId(null);
    }
  }

  function formatDate(dateStr: string) {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  }

  // Summary stats
  const totalIncome = transactions
    .filter((tx) => tx.type === "income")
    .reduce((sum, tx) => sum + tx.amount, 0);
  const totalExpenses = transactions
    .filter((tx) => tx.type === "expense")
    .reduce((sum, tx) => sum + tx.amount, 0);

  return (
    <>
      {/* Summary cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <p className="text-sm text-slate-500">Total Income</p>
          <p className="mt-1 text-2xl font-bold text-emerald-600">
            +₹{totalIncome.toLocaleString("en-IN")}
          </p>
          <p className="mt-1 text-xs text-slate-400">
            {transactions.filter((tx) => tx.type === "income").length} transactions
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <p className="text-sm text-slate-500">Total Expenses</p>
          <p className="mt-1 text-2xl font-bold text-red-500">
            -₹{totalExpenses.toLocaleString("en-IN")}
          </p>
          <p className="mt-1 text-xs text-slate-400">
            {transactions.filter((tx) => tx.type === "expense").length} transactions
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <p className="text-sm text-slate-500">Net</p>
          <p className={`mt-1 text-2xl font-bold ${totalIncome - totalExpenses >= 0 ? "text-slate-950" : "text-red-500"}`}>
            ₹{(totalIncome - totalExpenses).toLocaleString("en-IN")}
          </p>
          <p className="mt-1 text-xs text-slate-400">
            {transactions.length} total transactions
          </p>
        </div>
      </div>

      {/* Controls */}
      <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
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

          {/* Payment method filter */}
          <div className="flex gap-1 rounded-lg bg-slate-100 p-1">
            <button
              type="button"
              onClick={() => setFilterPayment("all")}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
                filterPayment === "all"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              All
            </button>
            {PAYMENT_METHODS.map((pm) => (
              <button
                key={pm.value}
                type="button"
                onClick={() => setFilterPayment(pm.value)}
                className={`rounded-md px-2 py-1.5 text-xs font-medium transition ${
                  filterPayment === pm.value
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-500 hover:text-slate-700"
                }`}
                title={pm.label}
              >
                {pm.icon}
              </button>
            ))}
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowAddModal(true)}
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
        >
          + Add Transaction
        </button>
      </div>

      {/* Transaction list */}
      <div className="mt-6 rounded-2xl border border-slate-200 bg-white">
        {filteredTransactions.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-sm text-slate-500">
              {transactions.length === 0
                ? "No transactions yet. Click \"Add Transaction\" to get started."
                : "No transactions match your filters."}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredTransactions.map((tx) => (
              <div
                key={tx.id}
                className="flex items-center gap-4 px-6 py-4 transition hover:bg-slate-50"
              >
                {/* Category color dot */}
                <div
                  className="h-3 w-3 flex-shrink-0 rounded-full"
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
                <div className="hidden sm:block">
                  {tx.categories ? (
                    <span
                      className="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium"
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

                {/* Payment method */}
                <div className="hidden md:block">
                  <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-600">
                    {PAYMENT_METHODS.find((pm) => pm.value === tx.payment_method)?.icon ?? "📎"}{" "}
                    {PAYMENT_METHODS.find((pm) => pm.value === tx.payment_method)?.label ?? tx.payment_method}
                  </span>
                </div>

                {/* Date */}
                <span className="text-xs text-slate-500">{formatDate(tx.date)}</span>

                {/* Amount */}
                <span
                  className={`w-28 text-right text-sm font-semibold ${
                    tx.type === "income" ? "text-emerald-600" : "text-red-500"
                  }`}
                >
                  {tx.type === "income" ? "+" : "-"}₹{tx.amount.toLocaleString("en-IN")}
                </span>

                {/* Delete */}
                <button
                  type="button"
                  onClick={() => handleDelete(tx.id)}
                  disabled={deletingId === tx.id}
                  className="flex-shrink-0 rounded p-1 text-slate-300 transition hover:bg-red-50 hover:text-red-500 disabled:opacity-40"
                  title="Delete"
                >
                  {deletingId === tx.id ? (
                    <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                  ) : (
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                    </svg>
                  )}
                </button>
              </div>
            ))}
          </div>
        )}

        {filteredTransactions.length > 0 && (
          <div className="border-t border-slate-100 px-6 py-3 text-center text-xs text-slate-400">
            Showing {filteredTransactions.length} of {transactions.length} transactions
          </div>
        )}
      </div>

      {/* Modal */}
      <AddTransactionModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSubmit={handleAdd}
        categories={categories}
      />
    </>
  );
}
