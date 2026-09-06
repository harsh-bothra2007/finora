"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { BudgetWithCategory, Category } from "@/lib/types/database";

interface BudgetsClientProps {
  initialBudgets: BudgetWithCategory[];
  expenseCategories: Category[];
  spentByCategory: Record<string, number>;
  userId: string;
}

export default function BudgetsClient({
  initialBudgets,
  expenseCategories,
  spentByCategory: initialSpent,
  userId,
}: BudgetsClientProps) {
  const [budgets, setBudgets] = useState(initialBudgets);
  const [spent] = useState(initialSpent);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [categoryId, setCategoryId] = useState("");
  const [amount, setAmount] = useState("");
  const [period, setPeriod] = useState<"weekly" | "monthly" | "yearly">("monthly");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Categories that don't have a budget yet
  const availableCategories = expenseCategories.filter(
    (cat) => !budgets.some((b) => b.category_id === cat.id) || editingId
  );

  function resetForm() {
    setCategoryId("");
    setAmount("");
    setPeriod("monthly");
    setEditingId(null);
    setError("");
    setShowForm(false);
  }

  function startEdit(budget: BudgetWithCategory) {
    setEditingId(budget.id);
    setCategoryId(budget.category_id);
    setAmount(String(budget.amount));
    setPeriod(budget.period);
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!categoryId) {
      setError("Please select a category.");
      return;
    }
    const parsedAmount = parseFloat(amount);
    if (!parsedAmount || parsedAmount <= 0) {
      setError("Amount must be greater than 0.");
      return;
    }

    setLoading(true);
    const supabase = createClient();

    try {
      if (editingId) {
        const { data, error: updateError } = await supabase
          .from("budgets")
          .update({
            category_id: categoryId,
            amount: parsedAmount,
            period,
          })
          .eq("id", editingId)
          .select("*, categories(name, icon, color)")
          .single();

        if (updateError) throw updateError;
        setBudgets((prev) =>
          prev.map((b) => (b.id === editingId ? data : b))
        );
      } else {
        const { data, error: insertError } = await supabase
          .from("budgets")
          .insert({
            user_id: userId,
            category_id: categoryId,
            amount: parsedAmount,
            period,
          })
          .select("*, categories(name, icon, color)")
          .single();

        if (insertError) throw insertError;
        setBudgets((prev) => [...prev, data]);
      }
      resetForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string) {
    const supabase = createClient();
    const { error } = await supabase.from("budgets").delete().eq("id", id);
    if (!error) {
      setBudgets((prev) => prev.filter((b) => b.id !== id));
    }
  }

  const totalBudget = budgets.reduce((sum, b) => sum + b.amount, 0);
  const totalSpent = budgets.reduce(
    (sum, b) => sum + (spent[b.category_id] ?? 0),
    0
  );

  return (
    <>
      {/* Summary */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/60">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
          <div>
            <p className="text-sm text-slate-500">Total Budget</p>
            <p className="mt-1 text-3xl font-bold text-slate-950">
              ₹{totalBudget.toLocaleString("en-IN")}
            </p>
          </div>
          <div>
            <p className="text-sm text-slate-500">Total Spent</p>
            <p className="mt-1 text-3xl font-bold text-red-500">
              ₹{totalSpent.toLocaleString("en-IN")}
            </p>
          </div>
          <div>
            <p className="text-sm text-slate-500">Remaining</p>
            <p className={`mt-1 text-3xl font-bold ${totalBudget - totalSpent >= 0 ? "text-emerald-600" : "text-red-500"}`}>
              ₹{(totalBudget - totalSpent).toLocaleString("en-IN")}
            </p>
          </div>
        </div>
      </div>

      {/* Header */}
      <div className="mt-8 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-950">Category Budgets</h2>
        <button
          type="button"
          onClick={() => {
            resetForm();
            setShowForm(true);
          }}
          disabled={availableCategories.length === 0}
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-50"
        >
          + Add Budget
        </button>
      </div>

      {/* Form modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={resetForm} />
          <div className="relative z-10 w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-950">
                {editingId ? "Edit Budget" : "New Budget"}
              </h2>
              <button
                type="button"
                onClick={resetForm}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">Category</label>
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-900"
                >
                  <option value="">Select category</option>
                  {availableCategories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">Budget Amount (₹)</label>
                <input
                  type="number"
                  step="0.01"
                  min="1"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="10000"
                  className="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-900"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">Period</label>
                <div className="flex gap-2">
                  {(["weekly", "monthly", "yearly"] as const).map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setPeriod(p)}
                      className={`flex-1 rounded-lg px-4 py-2.5 text-sm font-medium capitalize transition ${
                        period === p
                          ? "bg-slate-900 text-white"
                          : "bg-slate-50 text-slate-600 hover:bg-slate-100"
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              {error && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                  {error}
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={resetForm}
                  className="flex-1 rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 rounded-lg bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60"
                >
                  {loading ? "Saving..." : editingId ? "Update" : "Create Budget"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Budgets list */}
      {budgets.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-slate-200 bg-white py-12 text-center">
          <p className="text-sm text-slate-500">
            No budgets set up yet. Create one to start tracking your spending limits.
          </p>
        </div>
      ) : (
        <div className="mt-6 space-y-4">
          {budgets.map((budget) => {
            const spentAmount = spent[budget.category_id] ?? 0;
            const percentage = Math.round((spentAmount / budget.amount) * 100);
            const isOver = percentage > 80;
            const remaining = budget.amount - spentAmount;

            return (
              <div
                key={budget.id}
                className="rounded-2xl border border-slate-200 bg-white p-6 transition hover:shadow-md"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="flex h-10 w-10 items-center justify-center rounded-xl text-sm font-bold"
                      style={{
                        backgroundColor: `${budget.categories.color}15`,
                        color: budget.categories.color,
                      }}
                    >
                      {budget.categories.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-medium text-slate-950">
                        {budget.categories.name}
                      </p>
                      <p className="text-xs text-slate-500 capitalize">
                        {budget.period} budget
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => startEdit(budget)}
                      className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                      title="Edit"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(budget.id)}
                      className="rounded-lg p-1.5 text-slate-400 transition hover:bg-red-50 hover:text-red-500"
                      title="Delete"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                      </svg>
                    </button>
                  </div>
                </div>

                {/* Progress */}
                <div className="mt-4">
                  <div className="mb-2 flex justify-between text-sm">
                    <span className="text-slate-600">
                      ₹{spentAmount.toLocaleString("en-IN")} spent
                    </span>
                    <span className="text-slate-500">
                      ₹{budget.amount.toLocaleString("en-IN")}
                    </span>
                  </div>
                  <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className={`h-full rounded-full transition-all ${
                        isOver ? "bg-red-500" : "bg-slate-900"
                      }`}
                      style={{ width: `${Math.min(percentage, 100)}%` }}
                    />
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <p className="text-xs text-slate-400">{percentage}% used</p>
                    <p className={`text-xs font-medium ${remaining >= 0 ? "text-slate-500" : "text-red-500"}`}>
                      {remaining >= 0
                        ? `₹${remaining.toLocaleString("en-IN")} remaining`
                        : `₹${Math.abs(remaining).toLocaleString("en-IN")} over budget`}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
