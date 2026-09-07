"use client";

import { useState, useMemo, useEffect } from "react";
import type {
  TransactionWithCategory,
  Category,
  PaymentMethod,
} from "@/lib/types/database";
import { PAYMENT_METHODS, resolvePaymentMethod } from "@/lib/types/database";
import {
  mockTransactions,
  mockCategories,
  mockCustomPaymentMethods,
  inr,
  formatDate,
} from "@/lib/mock-data";
import Modal from "@/components/ui/Modal";
import ConfirmDialog from "@/components/ui/ConfirmDialog";

type SortOrder = "newest" | "oldest" | "highest" | "lowest";
type FilterType = "all" | "income" | "expense";

interface TxFormState {
  type: "income" | "expense";
  name: string;
  amount: string;
  categoryId: string;
  paymentMethod: PaymentMethod;
  date: string;
  notes: string;
}

const emptyForm: TxFormState = {
  type: "expense",
  name: "",
  amount: "",
  categoryId: "",
  paymentMethod: "upi",
  date: new Date().toISOString().slice(0, 10),
  notes: "",
};

const PAGE_SIZE = 8;

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState(mockTransactions);
  const [loading, setLoading] = useState(true);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<FilterType>("all");
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterPayment, setFilterPayment] = useState<PaymentMethod | "all">("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [sortBy, setSortBy] = useState<SortOrder>("newest");

  const [showAddModal, setShowAddModal] = useState(false);
  const [editingTx, setEditingTx] = useState<TransactionWithCategory | null>(null);
  const [deletingTx, setDeletingTx] = useState<TransactionWithCategory | null>(null);

  // Simulate a brief load so the skeleton state is visible
  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 600);
    return () => clearTimeout(t);
  }, []);

  const filtered = useMemo(() => {
    let result = [...transactions];
    if (filterType !== "all") result = result.filter((tx) => tx.type === filterType);
    if (filterCategory !== "all") result = result.filter((tx) => tx.category_id === filterCategory);
    if (filterPayment !== "all") result = result.filter((tx) => tx.payment_method === filterPayment);
    if (dateFrom) result = result.filter((tx) => tx.date >= dateFrom);
    if (dateTo) result = result.filter((tx) => tx.date <= dateTo);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (tx) =>
          tx.name.toLowerCase().includes(q) ||
          tx.categories?.name?.toLowerCase().includes(q) ||
          tx.notes.toLowerCase().includes(q)
      );
    }
    switch (sortBy) {
      case "newest": result.sort((a, b) => b.date.localeCompare(a.date)); break;
      case "oldest": result.sort((a, b) => a.date.localeCompare(b.date)); break;
      case "highest": result.sort((a, b) => b.amount - a.amount); break;
      case "lowest": result.sort((a, b) => a.amount - b.amount); break;
    }
    return result;
  }, [transactions, filterType, filterCategory, filterPayment, dateFrom, dateTo, searchQuery, sortBy]);

  const visible = filtered.slice(0, visibleCount);

  const totalIncome = transactions.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
  const totalExpenses = transactions.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);
  const net = totalIncome - totalExpenses;

  const hasActiveFilters =
    filterType !== "all" || filterCategory !== "all" || filterPayment !== "all" || dateFrom || dateTo || searchQuery.trim();

  function clearFilters() {
    setFilterType("all");
    setFilterCategory("all");
    setFilterPayment("all");
    setDateFrom("");
    setDateTo("");
    setSearchQuery("");
    setVisibleCount(PAGE_SIZE);
  }

  function handleSave(form: TxFormState, id?: string) {
    const category = mockCategories.find((c) => c.id === form.categoryId) ?? null;
    if (id) {
      setTransactions((prev) =>
        prev.map((tx) =>
          tx.id === id
            ? {
                ...tx,
                type: form.type,
                name: form.name.trim(),
                amount: parseFloat(form.amount),
                category_id: form.categoryId || null,
                categories: category,
                payment_method: form.paymentMethod,
                date: form.date,
                notes: form.notes.trim(),
              }
            : tx
        )
      );
    } else {
      const newTx: TransactionWithCategory = {
        id: `t${Date.now()}`,
        user_id: "u1",
        category_id: form.categoryId || null,
        name: form.name.trim(),
        amount: parseFloat(form.amount),
        type: form.type,
        payment_method: form.paymentMethod,
        date: form.date,
        notes: form.notes.trim(),
        created_at: "",
        updated_at: "",
        categories: category,
      };
      setTransactions((prev) => [newTx, ...prev]);
    }
    setShowAddModal(false);
    setEditingTx(null);
  }

  function handleDelete() {
    if (!deletingTx) return;
    setTransactions((prev) => prev.filter((tx) => tx.id !== deletingTx.id));
    setDeletingTx(null);
  }

  const expenseCategories = mockCategories.filter((c) => c.type === "expense");

  return (
    <>
      {/* Page header */}
      <section className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-slate-900">Transactions</h2>
          <p className="mt-0.5 text-xs text-slate-500">
            Track and manage every income and expense in one place.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-3.5 py-2 text-xs font-medium text-white shadow-sm transition-colors hover:bg-brand-700"
        >
          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path d="M12 4v16m8-8H4" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" />
          </svg>
          Add Transaction
        </button>
      </section>

      {/* Summary cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Total Income</p>
          <p className="mt-1 font-mono text-2xl font-bold text-emerald-600">
            +{inr(totalIncome)}
          </p>
          <p className="mt-1 text-xs text-slate-400">
            {transactions.filter((t) => t.type === "income").length} transactions
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Total Expenses</p>
          <p className="mt-1 font-mono text-2xl font-bold text-red-500">
            −{inr(totalExpenses)}
          </p>
          <p className="mt-1 text-xs text-slate-400">
            {transactions.filter((t) => t.type === "expense").length} transactions
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Net Balance</p>
          <p className={`mt-1 font-mono text-2xl font-bold ${net >= 0 ? "text-slate-950" : "text-red-500"}`}>
            {inr(net)}
          </p>
          <p className="mt-1 text-xs text-slate-400">{transactions.length} total transactions</p>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative">
              <svg className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
              </svg>
              <input
                type="text"
                placeholder="Search transactions..."
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setVisibleCount(PAGE_SIZE); }}
                className="w-full rounded-lg border border-slate-300 bg-slate-50 py-2 pl-10 pr-4 text-sm outline-none transition focus:border-slate-900 focus:bg-white sm:w-64"
              />
            </div>
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
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex gap-1 rounded-lg bg-slate-100 p-1">
            {(["all", "income", "expense"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => { setFilterType(t); setVisibleCount(PAGE_SIZE); }}
                className={`rounded-md px-3 py-1.5 text-xs font-medium capitalize transition ${
                  filterType === t ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          <select
            value={filterCategory}
            onChange={(e) => { setFilterCategory(e.target.value); setVisibleCount(PAGE_SIZE); }}
            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-700 outline-none transition focus:border-slate-900"
          >
            <option value="all">All categories</option>
            {mockCategories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>

          <select
            value={filterPayment}
            onChange={(e) => { setFilterPayment(e.target.value as PaymentMethod | "all"); setVisibleCount(PAGE_SIZE); }}
            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-700 outline-none transition focus:border-slate-900"
          >
            <option value="all">All payment methods</option>
            {PAYMENT_METHODS.map((pm) => (
              <option key={pm.value} value={pm.value}>{pm.label}</option>
            ))}
          </select>

          <div className="flex items-center gap-2">
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => { setDateFrom(e.target.value); setVisibleCount(PAGE_SIZE); }}
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-700 outline-none transition focus:border-slate-900"
            />
            <span className="text-xs text-slate-400">to</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => { setDateTo(e.target.value); setVisibleCount(PAGE_SIZE); }}
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-700 outline-none transition focus:border-slate-900"
            />
          </div>

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
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        {loading ? (
          <SkeletonRows />
        ) : visible.length === 0 ? (
          <EmptyTransactions hasData={transactions.length > 0} onAdd={() => setShowAddModal(true)} />
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/50 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                    <th className="px-5 py-3">Transaction</th>
                    <th className="px-3 py-3">Category</th>
                    <th className="px-3 py-3">Date</th>
                    <th className="px-3 py-3">Payment</th>
                    <th className="px-5 py-3 text-right">Amount</th>
                    <th className="px-5 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                  {visible.map((tx) => (
                    <TxRow key={tx.id} tx={tx} onEdit={() => setEditingTx(tx)} onDelete={() => setDeletingTx(tx)} />
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="divide-y divide-slate-100 md:hidden">
              {visible.map((tx) => (
                <TxCard key={tx.id} tx={tx} onEdit={() => setEditingTx(tx)} onDelete={() => setDeletingTx(tx)} />
              ))}
            </div>

            {/* Footer / load more */}
            <div className="flex flex-col items-center gap-3 border-t border-slate-100 px-6 py-3 sm:flex-row sm:justify-between">
              <p className="text-xs text-slate-400">
                Showing {visible.length} of {filtered.length} transactions
              </p>
              {visibleCount < filtered.length && (
                <button
                  type="button"
                  onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
                  className="rounded-lg border border-slate-200 bg-white px-4 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
                >
                  Load more
                </button>
              )}
            </div>
          </>
        )}
      </div>

      {/* Add modal */}
      <Modal open={showAddModal} onClose={() => setShowAddModal(false)} title="Add Transaction">
        <TransactionForm
          initial={emptyForm}
          categories={mockCategories}
          onCancel={() => setShowAddModal(false)}
          onSubmit={(form) => handleSave(form)}
        />
      </Modal>

      {/* Edit modal */}
      <Modal open={editingTx !== null} onClose={() => setEditingTx(null)} title="Edit Transaction">
        {editingTx && (
          <TransactionForm
            initial={{
              type: editingTx.type,
              name: editingTx.name,
              amount: String(editingTx.amount),
              categoryId: editingTx.category_id ?? "",
              paymentMethod: editingTx.payment_method,
              date: editingTx.date,
              notes: editingTx.notes,
            }}
            categories={mockCategories}
            onCancel={() => setEditingTx(null)}
            onSubmit={(form) => handleSave(form, editingTx.id)}
          />
        )}
      </Modal>

      {/* Delete confirm */}
      <ConfirmDialog
        open={deletingTx !== null}
        onClose={() => setDeletingTx(null)}
        onConfirm={handleDelete}
        title="Delete transaction"
        message={`Are you sure you want to delete "${deletingTx?.name ?? ""}"? This action cannot be undone.`}
      />
    </>
  );
}

/* ---------- Transaction row (desktop) ---------- */
function TxRow({
  tx,
  onEdit,
  onDelete,
}: {
  tx: TransactionWithCategory;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const isIncome = tx.type === "income";
  const pm = resolvePaymentMethod(tx.payment_method, mockCustomPaymentMethods);
  return (
    <tr className="transition-colors hover:bg-slate-50/70">
      <td className="px-5 py-3">
        <div className="flex items-center gap-2.5">
          <div
            className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg text-sm"
            style={{
              backgroundColor: tx.categories ? `${tx.categories.color}15` : "#f1f5f9",
            }}
          >
            {tx.categories?.icon ?? "💸"}
          </div>
          <div className="min-w-0">
            <p className="truncate font-medium text-slate-900">{tx.name}</p>
            {tx.notes && <p className="truncate text-[11px] text-slate-400">{tx.notes}</p>}
          </div>
        </div>
      </td>
      <td className="px-3 py-3">
        {tx.categories ? (
          <span
            className="inline-flex rounded-full px-2.5 py-1 text-[10px] font-medium"
            style={{ backgroundColor: `${tx.categories.color}15`, color: tx.categories.color }}
          >
            {tx.categories.name}
          </span>
        ) : (
          <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-medium text-slate-500">
            Uncategorized
          </span>
        )}
      </td>
      <td className="px-3 py-3 text-[11px] text-slate-400">{formatDate(tx.date)}</td>
      <td className="px-3 py-3">
        <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1 text-[11px] text-slate-600">
          {pm.icon} {pm.label}
        </span>
      </td>
      <td className="px-5 py-3 text-right">
        <span className={`font-mono text-sm font-semibold tabular-nums ${isIncome ? "text-emerald-600" : "text-red-500"}`}>
          {isIncome ? "+" : "−"}{inr(tx.amount)}
        </span>
      </td>
      <td className="px-5 py-3">
        <div className="flex items-center justify-end gap-1">
          <button type="button" onClick={onEdit} title="Edit" className="rounded p-1.5 text-slate-300 transition hover:bg-slate-100 hover:text-slate-600">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
            </svg>
          </button>
          <button type="button" onClick={onDelete} title="Delete" className="rounded p-1.5 text-slate-300 transition hover:bg-red-50 hover:text-red-500">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
            </svg>
          </button>
        </div>
      </td>
    </tr>
  );
}

/* ---------- Transaction card (mobile) ---------- */
function TxCard({
  tx,
  onEdit,
  onDelete,
}: {
  tx: TransactionWithCategory;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const isIncome = tx.type === "income";
  const pm = resolvePaymentMethod(tx.payment_method, mockCustomPaymentMethods);
  return (
    <div className="flex items-center gap-3 px-4 py-3.5">
      <div
        className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg text-base"
        style={{ backgroundColor: tx.categories ? `${tx.categories.color}15` : "#f1f5f9" }}
      >
        {tx.categories?.icon ?? "💸"}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-slate-900">{tx.name}</p>
        <div className="mt-0.5 flex items-center gap-2 text-[11px] text-slate-400">
          <span>{tx.categories?.name ?? "Uncategorized"}</span>
          <span>·</span>
          <span>{formatDate(tx.date)}</span>
          <span>·</span>
          <span>{pm.icon} {pm.label}</span>
        </div>
      </div>
      <div className="flex flex-col items-end gap-1">
        <span className={`font-mono text-sm font-semibold tabular-nums ${isIncome ? "text-emerald-600" : "text-red-500"}`}>
          {isIncome ? "+" : "−"}{inr(tx.amount)}
        </span>
        <div className="flex gap-1">
          <button type="button" onClick={onEdit} title="Edit" className="rounded p-1 text-slate-300 transition hover:bg-slate-100 hover:text-slate-600">
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
            </svg>
          </button>
          <button type="button" onClick={onDelete} title="Delete" className="rounded p-1 text-slate-300 transition hover:bg-red-50 hover:text-red-500">
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------- Skeleton ---------- */
function SkeletonRows() {
  return (
    <div className="divide-y divide-slate-100">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 px-5 py-4">
          <div className="h-8 w-8 animate-pulse rounded-lg bg-slate-200" />
          <div className="flex-1 space-y-2">
            <div className="h-3 w-40 animate-pulse rounded bg-slate-200" />
            <div className="h-2.5 w-24 animate-pulse rounded bg-slate-100" />
          </div>
          <div className="h-5 w-16 animate-pulse rounded-full bg-slate-100" />
          <div className="h-3 w-20 animate-pulse rounded bg-slate-100" />
          <div className="h-5 w-24 animate-pulse rounded bg-slate-200" />
        </div>
      ))}
    </div>
  );
}

/* ---------- Empty state ---------- */
function EmptyTransactions({ hasData, onAdd }: { hasData: boolean; onAdd: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-slate-400">
        <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
        </svg>
      </div>
      <p className="mt-3 text-sm font-medium text-slate-700">
        {hasData ? "No transactions match your filters" : "No transactions yet"}
      </p>
      <p className="mt-1 max-w-xs text-xs leading-relaxed text-slate-500">
        {hasData
          ? "Try adjusting your search or filters to find what you're looking for."
          : "Add your first income or expense to start tracking your finances."}
      </p>
      {!hasData && (
        <button
          type="button"
          onClick={onAdd}
          className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-3.5 py-2 text-xs font-medium text-white transition hover:bg-brand-700"
        >
          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path d="M12 4v16m8-8H4" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" />
          </svg>
          Add Transaction
        </button>
      )}
    </div>
  );
}

/* ---------- Transaction form (add/edit) ---------- */
function TransactionForm({
  initial,
  categories,
  onCancel,
  onSubmit,
}: {
  initial: TxFormState;
  categories: Category[];
  onCancel: () => void;
  onSubmit: (form: TxFormState) => void;
}) {
  const [form, setForm] = useState<TxFormState>(initial);
  const [error, setError] = useState("");
  const filteredCategories = categories.filter((c) => c.type === form.type);

  function update<K extends keyof TxFormState>(key: K, value: TxFormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return setError("Please enter a name.");
    const amt = parseFloat(form.amount);
    if (!amt || amt <= 0) return setError("Please enter a valid amount.");
    setError("");
    onSubmit({ ...form, name: form.name.trim(), notes: form.notes.trim() });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => { update("type", "expense"); update("categoryId", ""); }}
          className={`flex-1 rounded-lg px-4 py-2.5 text-sm font-medium transition ${
            form.type === "expense" ? "bg-red-50 text-red-700 ring-1 ring-red-200" : "bg-slate-50 text-slate-600 hover:bg-slate-100"
          }`}
        >
          Expense
        </button>
        <button
          type="button"
          onClick={() => { update("type", "income"); update("categoryId", ""); }}
          className={`flex-1 rounded-lg px-4 py-2.5 text-sm font-medium transition ${
            form.type === "income" ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200" : "bg-slate-50 text-slate-600 hover:bg-slate-100"
          }`}
        >
          Income
        </button>
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-slate-700">Transaction name</label>
        <input
          type="text"
          placeholder="e.g. Groceries, Salary"
          value={form.name}
          onChange={(e) => update("name", e.target.value)}
          required
          className="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-900"
        />
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-slate-700">Amount (₹)</label>
        <input
          type="number"
          step="0.01"
          min="0.01"
          placeholder="0.00"
          value={form.amount}
          onChange={(e) => update("amount", e.target.value)}
          required
          className="w-full rounded-lg border border-slate-300 px-4 py-3 font-mono text-sm outline-none transition focus:border-slate-900"
        />
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-slate-700">Category</label>
        <select
          value={form.categoryId}
          onChange={(e) => update("categoryId", e.target.value)}
          className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-900"
        >
          <option value="">Select category</option>
          {filteredCategories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-slate-700">Payment method</label>
        <div className="grid grid-cols-4 gap-2">
          {PAYMENT_METHODS.map((pm) => (
            <button
              key={pm.value}
              type="button"
              onClick={() => update("paymentMethod", pm.value)}
              className={`flex flex-col items-center gap-1 rounded-lg px-2 py-2.5 text-xs font-medium transition ${
                form.paymentMethod === pm.value ? "bg-slate-900 text-white" : "bg-slate-50 text-slate-600 hover:bg-slate-100"
              }`}
            >
              <span className="text-base">{pm.icon}</span>
              <span className="w-full truncate text-center text-[10px] leading-tight">{pm.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-slate-700">Date</label>
        <input
          type="date"
          value={form.date}
          onChange={(e) => update("date", e.target.value)}
          required
          className="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-900"
        />
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-slate-700">
          Notes <span className="font-normal text-slate-400">(optional)</span>
        </label>
        <textarea
          placeholder="Any additional details..."
          value={form.notes}
          onChange={(e) => update("notes", e.target.value)}
          rows={2}
          className="w-full resize-none rounded-lg border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-900"
        />
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>
      )}

      <div className="flex gap-3 pt-2">
        <button type="button" onClick={onCancel} className="flex-1 rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50">
          Cancel
        </button>
        <button type="submit" className="flex-1 rounded-lg bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800">
          Save Transaction
        </button>
      </div>
    </form>
  );
}
