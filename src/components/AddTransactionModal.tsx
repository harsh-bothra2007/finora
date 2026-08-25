"use client";

import { useState } from "react";
import type { Category, PaymentMethod } from "@/lib/types/database";
import { PAYMENT_METHODS } from "@/lib/types/database";

interface AddTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: {
    name: string;
    amount: number;
    type: "income" | "expense";
    category_id: string;
    payment_method: PaymentMethod;
    date: string;
    notes: string;
  }) => Promise<void>;
  categories: Category[];
}

export default function AddTransactionModal({
  isOpen,
  onClose,
  onSubmit,
  categories,
}: AddTransactionModalProps) {
  const [type, setType] = useState<"income" | "expense">("expense");
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("upi");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const filteredCategories = categories.filter((c) => c.type === type);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!name.trim()) {
      setError("Please enter a name.");
      return;
    }
    const parsedAmount = parseFloat(amount);
    if (!parsedAmount || parsedAmount <= 0) {
      setError("Please enter a valid amount.");
      return;
    }

    setLoading(true);
    try {
      await onSubmit({
        name: name.trim(),
        amount: parsedAmount,
        type,
        category_id: categoryId || filteredCategories[0]?.id || "",
        payment_method: paymentMethod,
        date,
        notes: notes.trim(),
      });
      // Reset form
      setName("");
      setAmount("");
      setCategoryId("");
      setPaymentMethod("upi");
      setDate(new Date().toISOString().slice(0, 10));
      setNotes("");
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative z-10 w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-950">
            Add Transaction
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Type toggle */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                setType("expense");
                setCategoryId("");
              }}
              className={`flex-1 rounded-lg px-4 py-2.5 text-sm font-medium transition ${
                type === "expense"
                  ? "bg-red-50 text-red-700 ring-1 ring-red-200"
                  : "bg-slate-50 text-slate-600 hover:bg-slate-100"
              }`}
            >
              Expense
            </button>
            <button
              type="button"
              onClick={() => {
                setType("income");
                setCategoryId("");
              }}
              className={`flex-1 rounded-lg px-4 py-2.5 text-sm font-medium transition ${
                type === "income"
                  ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
                  : "bg-slate-50 text-slate-600 hover:bg-slate-100"
              }`}
            >
              Income
            </button>
          </div>

          {/* Name */}
          <div>
            <label
              htmlFor="tx-name"
              className="mb-2 block text-sm font-medium text-slate-700"
            >
              Name
            </label>
            <input
              id="tx-name"
              type="text"
              placeholder="e.g. Groceries, Salary"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-900"
            />
          </div>

          {/* Amount */}
          <div>
            <label
              htmlFor="tx-amount"
              className="mb-2 block text-sm font-medium text-slate-700"
            >
              Amount (₹)
            </label>
            <input
              id="tx-amount"
              type="number"
              step="0.01"
              min="0.01"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
              className="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-900"
            />
          </div>

          {/* Payment Method */}
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Payment Method
            </label>
            <div className="grid grid-cols-3 gap-2">
              {PAYMENT_METHODS.map((pm) => (
                <button
                  key={pm.value}
                  type="button"
                  onClick={() => setPaymentMethod(pm.value)}
                  className={`flex flex-col items-center gap-1 rounded-lg px-3 py-2.5 text-xs font-medium transition ${
                    paymentMethod === pm.value
                      ? "bg-slate-900 text-white"
                      : "bg-slate-50 text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  <span className="text-base">{pm.icon}</span>
                  {pm.label}
                </button>
              ))}
            </div>
          </div>

          {/* Category */}
          <div>
            <label
              htmlFor="tx-category"
              className="mb-2 block text-sm font-medium text-slate-700"
            >
              Category
            </label>
            <select
              id="tx-category"
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-900"
            >
              <option value="">Select category</option>
              {filteredCategories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          {/* Date */}
          <div>
            <label
              htmlFor="tx-date"
              className="mb-2 block text-sm font-medium text-slate-700"
            >
              Date
            </label>
            <input
              id="tx-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
              className="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-900"
            />
          </div>

          {/* Notes */}
          <div>
            <label
              htmlFor="tx-notes"
              className="mb-2 block text-sm font-medium text-slate-700"
            >
              Notes{" "}
              <span className="font-normal text-slate-400">(optional)</span>
            </label>
            <textarea
              id="tx-notes"
              placeholder="Any additional details..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full resize-none rounded-lg border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-900"
            />
          </div>

          {/* Error */}
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 rounded-lg bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Adding..." : "Add Transaction"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
