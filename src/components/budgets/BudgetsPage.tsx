"use client";

import { useState, useMemo, useEffect } from "react";
import type { BudgetWithCategory, Category } from "@/lib/types/database";
import {
  mockBudgets,
  mockBudgetSpent,
  mockCategories,
  inr,
} from "@/lib/mock-data";
import Modal from "@/components/ui/Modal";
import ConfirmDialog from "@/components/ui/ConfirmDialog";

type Period = "weekly" | "monthly" | "yearly";

interface BudgetFormState {
  categoryId: string;
  amount: string;
  period: Period;
}

const emptyForm: BudgetFormState = { categoryId: "", amount: "", period: "monthly" };

function budgetState(pct: number): "healthy" | "warning" | "exceeded" {
  if (pct > 100) return "exceeded";
  if (pct >= 80) return "warning";
  return "healthy";
}

const STATE_STYLES: Record<string, { bar: string; badge: string; label: string }> = {
  healthy: { bar: "bg-slate-900", badge: "border-slate-200 bg-slate-50 text-slate-600", label: "On track" },
  warning: { bar: "bg-amber-500", badge: "border-amber-200 bg-amber-50 text-amber-700", label: "Warning" },
  exceeded: { bar: "bg-red-500", badge: "border-red-200 bg-red-50 text-red-700", label: "Over budget" },
};

export default function BudgetsPage() {
  const [budgets, setBudgets] = useState(mockBudgets);
  const [spent] = useState(mockBudgetSpent);
  const [loading, setLoading] = useState(true);
  const [filterPeriod, setFilterPeriod] = useState<"all" | Period>("all");
  const [filterCategory, setFilterCategory] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<BudgetFormState>(emptyForm);
  const [error, setError] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 600);
    return () => clearTimeout(t);
  }, []);

  const expenseCategories = mockCategories.filter((c) => c.type === "expense");

  const filtered = useMemo(() => {
    return budgets.filter((b) => {
      if (filterPeriod !== "all" && b.period !== filterPeriod) return false;
      if (filterCategory !== "all" && b.category_id !== filterCategory) return false;
      return true;
    });
  }, [budgets, filterPeriod, filterCategory]);

  const totalBudget = budgets.reduce((s, b) => s + b.amount, 0);
  const totalSpent = budgets.reduce((s, b) => s + (spent[b.category_id] ?? 0), 0);
  const remaining = totalBudget - totalSpent;
  const overallPct = totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 100) : 0;

  const availableCategories = expenseCategories.filter(
    (cat) => !budgets.some((b) => b.category_id === cat.id) || editingId === form.categoryId
  );

  function openCreate() {
    setForm(emptyForm);
    setEditingId(null);
    setError("");
    setShowForm(true);
  }

  function openEdit(b: BudgetWithCategory) {
    setEditingId(b.id);
    setForm({ categoryId: b.category_id, amount: String(b.amount), period: b.period });
    setError("");
    setShowForm(true);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.categoryId) return setError("Please select a category.");
    const amt = parseFloat(form.amount);
    if (!amt || amt <= 0) return setError("Amount must be greater than 0.");
    setError("");
    const category = expenseCategories.find((c) => c.id === form.categoryId)!;
    if (editingId) {
      setBudgets((prev) =>
        prev.map((b) =>
          b.id === editingId
            ? { ...b, category_id: form.categoryId, amount: amt, period: form.period, categories: category }
            : b
        )
      );
    } else {
      const newBudget: BudgetWithCategory = {
        id: `b${Date.now()}`,
        user_id: "u1",
        category_id: form.categoryId,
        amount: amt,
        period: form.period,
        start_date: new Date().toISOString().slice(0, 10),
        created_at: "",
        updated_at: "",
        categories: category,
      };
      setBudgets((prev) => [...prev, newBudget]);
    }
    setShowForm(false);
    setEditingId(null);
  }

  function handleDelete() {
    if (!deletingId) return;
    setBudgets((prev) => prev.filter((b) => b.id !== deletingId));
    setDeletingId(null);
  }

  return (
    <>
      {/* Page header */}
      <section className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-slate-900">Budgets</h2>
          <p className="mt-0.5 text-xs text-slate-500">
            Set spending limits per category and stay on track.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-3.5 py-2 text-xs font-medium text-white shadow-sm transition-colors hover:bg-brand-700"
        >
          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path d="M12 4v16m8-8H4" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" />
          </svg>
          Create Budget
        </button>
      </section>

      {/* Summary */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-4">
          <div>
            <p className="text-sm text-slate-500">Total Budget</p>
            <p className="mt-1 font-mono text-2xl font-bold text-slate-950">{inr(totalBudget)}</p>
          </div>
          <div>
            <p className="text-sm text-slate-500">Total Spent</p>
            <p className="mt-1 font-mono text-2xl font-bold text-red-500">{inr(totalSpent)}</p>
          </div>
          <div>
            <p className="text-sm text-slate-500">Remaining</p>
            <p className={`mt-1 font-mono text-2xl font-bold ${remaining >= 0 ? "text-emerald-600" : "text-red-500"}`}>
              {inr(remaining)}
            </p>
          </div>
          <div>
            <p className="text-sm text-slate-500">Utilization</p>
            <p className="mt-1 font-mono text-2xl font-bold text-slate-950">{overallPct}%</p>
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
              <div
                className={`h-full rounded-full ${STATE_STYLES[budgetState(overallPct)].bar}`}
                style={{ width: `${Math.min(overallPct, 100)}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex gap-1 rounded-lg bg-slate-100 p-1">
          {(["all", "weekly", "monthly", "yearly"] as const).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setFilterPeriod(p)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium capitalize transition ${
                filterPeriod === p ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
              }`}
            >
              {p === "all" ? "All periods" : p}
            </button>
          ))}
        </div>
        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-700 outline-none transition focus:border-slate-900"
        >
          <option value="all">All categories</option>
          {expenseCategories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

      {/* Budget cards */}
      {loading ? (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-36 animate-pulse rounded-xl border border-slate-200 bg-white" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-white px-6 py-14 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-slate-400">
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <p className="mt-3 text-sm font-medium text-slate-700">
            {budgets.length === 0 ? "No budgets yet" : "No budgets match your filters"}
          </p>
          <p className="mt-1 max-w-xs text-xs leading-relaxed text-slate-500">
            {budgets.length === 0
              ? "Create a budget for a category to start tracking your spending limits."
              : "Try a different period or category filter."}
          </p>
          {budgets.length === 0 && (
            <button
              type="button"
              onClick={openCreate}
              className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-3.5 py-2 text-xs font-medium text-white transition hover:bg-brand-700"
            >
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path d="M12 4v16m8-8H4" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" />
              </svg>
              Create Budget
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {filtered.map((budget) => {
            const spentAmount = spent[budget.category_id] ?? 0;
            const pct = budget.amount > 0 ? Math.round((spentAmount / budget.amount) * 100) : 0;
            const state = budgetState(pct);
            const style = STATE_STYLES[state];
            const rem = budget.amount - spentAmount;
            return (
              <div key={budget.id} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="flex h-10 w-10 items-center justify-center rounded-xl text-base"
                      style={{ backgroundColor: `${budget.categories.color}15` }}
                    >
                      {budget.categories.icon}
                    </div>
                    <div>
                      <p className="font-medium text-slate-950">{budget.categories.name}</p>
                      <p className="text-xs capitalize text-slate-500">{budget.period} budget</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold ${style.badge}`}>
                      {style.label}
                    </span>
                    <div className="flex gap-1">
                      <button type="button" onClick={() => openEdit(budget)} title="Edit" className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600">
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                        </svg>
                      </button>
                      <button type="button" onClick={() => setDeletingId(budget.id)} title="Delete" className="rounded-lg p-1.5 text-slate-400 transition hover:bg-red-50 hover:text-red-500">
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>

                <div className="mt-4">
                  <div className="mb-2 flex items-center justify-between text-sm">
                    <span className="font-mono text-slate-600">{inr(spentAmount)} spent</span>
                    <span className="font-mono text-slate-500">{inr(budget.amount)}</span>
                  </div>
                  <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
                    <div className={`h-full rounded-full transition-all ${style.bar}`} style={{ width: `${Math.min(pct, 100)}%` }} />
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <p className="text-xs text-slate-400">{pct}% used</p>
                    <p className={`text-xs font-medium ${rem >= 0 ? "text-slate-500" : "text-red-500"}`}>
                      {rem >= 0 ? `${inr(rem)} remaining` : `${inr(Math.abs(rem))} over budget`}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create/Edit modal */}
      <Modal open={showForm} onClose={() => setShowForm(false)} title={editingId ? "Edit Budget" : "Create Budget"}>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">Category</label>
            <select
              value={form.categoryId}
              onChange={(e) => setForm((f) => ({ ...f, categoryId: e.target.value }))}
              className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-900"
            >
              <option value="">Select category</option>
              {availableCategories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">Budget limit (₹)</label>
            <input
              type="number"
              step="0.01"
              min="1"
              placeholder="10000"
              value={form.amount}
              onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
              className="w-full rounded-lg border border-slate-300 px-4 py-3 font-mono text-sm outline-none transition focus:border-slate-900"
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">Period</label>
            <div className="flex gap-2">
              {(["weekly", "monthly", "yearly"] as const).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, period: p }))}
                  className={`flex-1 rounded-lg px-4 py-2.5 text-sm font-medium capitalize transition ${
                    form.period === p ? "bg-slate-900 text-white" : "bg-slate-50 text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
          {error && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setShowForm(false)} className="flex-1 rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50">
              Cancel
            </button>
            <button type="submit" className="flex-1 rounded-lg bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800">
              {editingId ? "Update" : "Create Budget"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete confirm */}
      <ConfirmDialog
        open={deletingId !== null}
        onClose={() => setDeletingId(null)}
        onConfirm={handleDelete}
        title="Delete budget"
        message="Are you sure you want to delete this budget? You can always create a new one later."
      />
    </>
  );
}
