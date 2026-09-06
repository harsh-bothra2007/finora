"use client";

import { useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  createTransaction,
  updateTransaction,
  deleteTransaction,
} from "@/lib/supabase/queries";
import type {
  TransactionWithCategory,
  Category,
  PaymentMethod,
  CustomPaymentMethod,
} from "@/lib/types/database";
import { PAYMENT_METHODS, resolvePaymentMethod } from "@/lib/types/database";
import AddTransactionModal from "@/components/AddTransactionModal";
import EditTransactionModal from "@/components/EditTransactionModal";

type SortOrder = "newest" | "oldest" | "highest" | "lowest";

interface TransactionsClientProps {
  initialTransactions: TransactionWithCategory[];
  categories: Category[];
  customPaymentMethods?: CustomPaymentMethod[];
}

export default function TransactionsClient({
  initialTransactions,
  categories,
  customPaymentMethods = [],
}: TransactionsClientProps) {
  const router = useRouter();
  const [transactions, setTransactions] = useState(initialTransactions);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingTx, setEditingTx] = useState<TransactionWithCategory | null>(null);
  const [filterType, setFilterType] = useState<"all" | "income" | "expense">("all");
  const [filterPayment, setFilterPayment] = useState<PaymentMethod | "all">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [sortBy, setSortBy] = useState<SortOrder>("newest");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const filteredTransactions = useMemo(() => {
    let result = [...transactions];

    // Type filter
    if (filterType !== "all") {
      result = result.filter((tx) => tx.type === filterType);
    }

    // Payment method filter
    if (filterPayment !== "all") {
      result = result.filter((tx) => tx.payment_method === filterPayment);
    }

    // Date range filter
    if (dateFrom) {
      result = result.filter((tx) => tx.date >= dateFrom);
    }
    if (dateTo) {
      result = result.filter((tx) => tx.date <= dateTo);
    }

    // Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (tx) =>
          tx.name.toLowerCase().includes(q) ||
          tx.categories?.name?.toLowerCase().includes(q) ||
          tx.notes.toLowerCase().includes(q)
      );
    }

    // Sort
    switch (sortBy) {
      case "newest":
        result.sort((a, b) => b.date.localeCompare(a.date));
        break;
      case "oldest":
        result.sort((a, b) => a.date.localeCompare(b.date));
        break;
      case "highest":
        result.sort((a, b) => b.amount - a.amount);
        break;
      case "lowest":
        result.sort((a, b) => a.amount - b.amount);
        break;
    }

    return result;
  }, [transactions, filterType, filterPayment, searchQuery, dateFrom, dateTo, sortBy]);

  // Summary stats (from all transactions, not filtered)
  const totalIncome = useMemo(
    () => transactions.filter((tx) => tx.type === "income").reduce((sum, tx) => sum + tx.amount, 0),
    [transactions]
  );
  const totalExpenses = useMemo(
    () => transactions.filter((tx) => tx.type === "expense").reduce((sum, tx) => sum + tx.amount, 0),
    [transactions]
  );

  const handleAdd = useCallback(async (data: {
    name: string;
    amount: number;
    type: "income" | "expense";
    category_id: string | null;
    payment_method: PaymentMethod;
    date: string;
    notes: string;
  }) => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    const newTx = await createTransaction({ user_id: user.id, ...data });
    setTransactions((prev) => [newTx, ...prev]);
  }, []);

  const handleEdit = useCallback(async (id: string, data: {
    name: string;
    amount: number;
    type: "income" | "expense";
    category_id: string | null;
    payment_method: PaymentMethod;
    date: string;
    notes: string;
  }) => {
    const updated = await updateTransaction(id, data);
    setTransactions((prev) => prev.map((tx) => (tx.id === id ? updated : tx)));
  }, []);

  const handleDelete = useCallback(async (id: string) => {
    setDeletingId(id);
    try {
      await deleteTransaction(id);
      setTransactions((prev) => prev.filter((tx) => tx.id !== id));
    } catch {
      router.refresh();
    } finally {
      setDeletingId(null);
    }
  }, [router]);

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  }

  const hasActiveFilters = filterType !== "all" || filterPayment !== "all" || dateFrom || dateTo || searchQuery.trim();

  function clearFilters() {
    setFilterType("all");
    setFilterPayment("all");
    setDateFrom("");
    setDateTo("");
    setSearchQuery("");
  }

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
      <div className="mt-8 flex flex-col gap-4">
        {/* Row 1: Search + Sort + Add button */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            {/* Search */}
            <div className="relative">
              <svg className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
              </svg>
              <input
                type="text"
                placeholder="Search transactions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-slate-50 py-2 pl-10 pr-4 text-sm outline-none transition focus:border-slate-900 focus:bg-white sm:w-64"
              />
            </div>

            {/* Sort */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOrder)}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-slate-900"
            >
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
              <option value="highest">Highest amount</option>
              <option value="lowest">Lowest amount</option>
            </select>
          </div>

          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            + Add Transaction
          </button>
        </div>

        {/* Row 2: Filters */}
        <div className="flex flex-wrap items-center gap-3">
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
          <div className="flex gap-1 rounded-lg bg-slate-100 p-1 flex-wrap">
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
            {customPaymentMethods.map((cm) => (
              <button
                key={cm.id}
                type="button"
                onClick={() => setFilterPayment(`custom:${cm.id}` as PaymentMethod)}
                className={`rounded-md px-2 py-1.5 text-xs font-medium transition ${
                  filterPayment === `custom:${cm.id}`
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-500 hover:text-slate-700"
                }`}
                title={cm.name}
              >
                {cm.icon}
              </button>
            ))}
          </div>

          {/* Date range */}
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              placeholder="From"
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-700 outline-none transition focus:border-slate-900"
            />
            <span className="text-xs text-slate-400">to</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              placeholder="To"
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-700 outline-none transition focus:border-slate-900"
            />
          </div>

          {/* Clear filters */}
          {hasActiveFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-500 transition hover:bg-slate-50"
            >
              Clear filters
            </button>
          )}
        </div>
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
          <>
            {/* Table header */}
            <div className="hidden grid-cols-13 gap-4 border-b border-slate-100 px-6 py-3 text-[11px] font-medium uppercase tracking-wider text-slate-400 sm:grid">
              <div className="col-span-3">Transaction</div>
              <div className="col-span-2">Category</div>
              <div className="col-span-2 text-center">Payment</div>
              <div className="col-span-2 text-right">Date</div>
              <div className="col-span-2 text-right">Amount</div>
              <div className="col-span-2 text-right">Actions</div>
            </div>

            <div className="divide-y divide-slate-100">
              {filteredTransactions.map((tx) => (
                <div
                  key={tx.id}
                  className="grid grid-cols-13 items-center gap-4 px-6 py-4 transition hover:bg-slate-50"
                >
                  {/* Name */}
                  <div className="col-span-3 min-w-0">
                    <p className="truncate text-sm font-medium text-slate-950">{tx.name}</p>
                    {tx.notes && (
                      <p className="mt-0.5 truncate text-xs text-slate-400">{tx.notes}</p>
                    )}
                  </div>

                  {/* Category */}
                  <div className="col-span-2">
                    {tx.categories ? (
                      <span
                        className="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium"
                        style={{ backgroundColor: `${tx.categories.color}15`, color: tx.categories.color }}
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
                  <div className="col-span-2 text-center">
                    <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-600">
                      {(() => {
                        const pmInfo = resolvePaymentMethod(tx.payment_method, customPaymentMethods);
                        return (
                          <>
                            {pmInfo.icon} {pmInfo.label}
                          </>
                        );
                      })()}
                    </span>
                  </div>

                  {/* Date */}
                  <div className="col-span-2 text-right">
                    <span className="text-xs text-slate-500">{formatDate(tx.date)}</span>
                  </div>

                  {/* Amount */}
                  <div className="col-span-2 text-right">
                    <span className={`text-sm font-semibold ${tx.type === "income" ? "text-emerald-600" : "text-red-500"}`}>
                      {tx.type === "income" ? "+" : "-"}₹{tx.amount.toLocaleString("en-IN")}
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="col-span-2 flex items-center justify-end gap-1">
                    <button
                      type="button"
                      onClick={() => setEditingTx(tx)}
                      className="rounded p-1.5 text-slate-300 transition hover:bg-slate-100 hover:text-slate-600"
                      title="Edit"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(tx.id)}
                      disabled={deletingId === tx.id}
                      className="rounded p-1.5 text-slate-300 transition hover:bg-red-50 hover:text-red-500 disabled:opacity-40"
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
                </div>
              ))}
            </div>

            {/* Footer */}
            <div className="border-t border-slate-100 px-6 py-3 text-center text-xs text-slate-400">
              Showing {filteredTransactions.length} of {transactions.length} transactions
            </div>
          </>
        )}
      </div>

      {/* Modals */}
      {/* key forces a fresh form (reset) each time the modal opens */}
      <AddTransactionModal
        key={showAddModal ? "open" : "closed"}
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSubmit={handleAdd}
        categories={categories}
        customPaymentMethods={customPaymentMethods}
      />
      <EditTransactionModal
        isOpen={editingTx !== null}
        onClose={() => setEditingTx(null)}
        onSubmit={handleEdit}
        transaction={editingTx}
        categories={categories}
        customPaymentMethods={customPaymentMethods}
      />
    </>
  );
}
