"use client";

import { useState, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import type {
  PaymentMethod,
  CustomPaymentMethod,
  PaymentMethodBudget,
} from "@/lib/types/database";
import { PAYMENT_METHODS, resolvePaymentMethod } from "@/lib/types/database";
import PaymentMethodBudgetsClient from "@/components/PaymentMethodBudgetsClient";

const COLORS = [
  "#64748b", "#ef4444", "#f97316", "#eab308", "#22c55e",
  "#14b8a6", "#3b82f6", "#8b5cf6", "#ec4899", "#f43f5e",
];

const ICONS = ["💳", "🏦", "💵", "🏛️", "👛", "🏧", "📎", "💰", "🪙", "🔄", "📱", "🎫"];

interface PaymentAnalytics {
  method: PaymentMethod;
  income: number;
  expense: number;
  count: number;
  total: number;
  lastUsed: string | null;
}

interface PaymentMethodsClientProps {
  initialCustomMethods: CustomPaymentMethod[];
  analytics: PaymentAnalytics[];
  budgets: PaymentMethodBudget[];
  spentByMethod: Record<string, number>;
  userId: string;
}

export default function PaymentMethodsClient({
  initialCustomMethods,
  analytics,
  budgets,
  spentByMethod,
  userId,
}: PaymentMethodsClientProps) {
  const [customMethods, setCustomMethods] = useState(initialCustomMethods);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [icon, setIcon] = useState("💳");
  const [color, setColor] = useState("#64748b");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<"all" | "analytics" | "budgets">("all");

  // Analytics resolved against all methods
  const resolvedAnalytics = useMemo(() => {
    return analytics.map((a) => ({
      ...a,
      info: resolvePaymentMethod(a.method, customMethods),
    }));
  }, [analytics, customMethods]);

  const totalExpense = resolvedAnalytics.reduce((s, a) => s + a.expense, 0);
  const totalIncome = resolvedAnalytics.reduce((s, a) => s + a.income, 0);
  const totalTransactions = resolvedAnalytics.reduce((s, a) => s + a.count, 0);

  function resetForm() {
    setName("");
    setIcon("💳");
    setColor("#64748b");
    setEditingId(null);
    setError("");
    setShowForm(false);
  }

  function startEdit(method: CustomPaymentMethod) {
    setEditingId(method.id);
    setName(method.name);
    setIcon(method.icon);
    setColor(method.color);
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!name.trim()) {
      setError("Payment method name is required.");
      return;
    }

    setLoading(true);
    const supabase = createClient();

    try {
      if (editingId) {
        const { data, error: updateError } = await supabase
          .from("custom_payment_methods")
          .update({ name: name.trim(), icon, color })
          .eq("id", editingId)
          .select()
          .single();

        if (updateError) throw updateError;
        setCustomMethods((prev) =>
          prev.map((m) => (m.id === editingId ? data : m))
        );
      } else {
        const { data, error: insertError } = await supabase
          .from("custom_payment_methods")
          .insert({
            user_id: userId,
            name: name.trim(),
            icon,
            color,
          })
          .select()
          .single();

        if (insertError) throw insertError;
        setCustomMethods((prev) => [...prev, data]);
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
    const { error } = await supabase
      .from("custom_payment_methods")
      .delete()
      .eq("id", id);
    if (!error) {
      setCustomMethods((prev) => prev.filter((m) => m.id !== id));
    }
  }

  return (
    <>
      {/* Tab switcher */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setActiveTab("all")}
          className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
            activeTab === "all"
              ? "bg-slate-900 text-white"
              : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
          }`}
        >
          💳 All Methods
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("analytics")}
          className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
            activeTab === "analytics"
              ? "bg-slate-900 text-white"
              : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
          }`}
        >
          📊 Analytics
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("budgets")}
          className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
            activeTab === "budgets"
              ? "bg-slate-900 text-white"
              : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
          }`}
        >
          💰 Budgets
        </button>
      </div>

      {/* ═══ ALL METHODS TAB ═══ */}
      {activeTab === "all" && (
        <>
          {/* Summary row */}
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <p className="text-sm text-slate-500">Total Income</p>
              <p className="mt-1 text-2xl font-bold text-emerald-600">
                ₹{totalIncome.toLocaleString("en-IN")}
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <p className="text-sm text-slate-500">Total Expenses</p>
              <p className="mt-1 text-2xl font-bold text-red-500">
                ₹{totalExpense.toLocaleString("en-IN")}
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <p className="text-sm text-slate-500">Transactions</p>
              <p className="mt-1 text-2xl font-bold text-slate-950">
                {totalTransactions.toLocaleString()}
              </p>
            </div>
          </div>

          {/* Built-in methods */}
          <div className="mt-8">
            <h3 className="text-sm font-semibold text-slate-700">
              Built-in Methods
            </h3>
            <p className="text-xs text-slate-500">
              These are always available for your transactions.
            </p>
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {PAYMENT_METHODS.map((pm) => {
                const stats = analytics.find((a) => a.method === pm.value);
                const budget = budgets.find((b) => b.payment_method === pm.value);
                const spentAmount = spentByMethod[pm.value] ?? 0;
                const budgetPct = budget ? Math.round((spentAmount / budget.amount) * 100) : null;
                const isOver = budgetPct !== null && budgetPct > 100;
                const isWarning = budgetPct !== null && budgetPct >= 80 && budgetPct <= 100;
                return (
                  <div
                    key={pm.value}
                    className={`rounded-2xl bg-white p-5 transition hover:shadow-md ${
                      isOver ? "border border-red-200" : isWarning ? "border border-amber-200" : "border border-slate-200"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{pm.icon}</span>
                      <div>
                        <p className="font-medium text-slate-950">{pm.label}</p>
                        <p className="text-xs text-slate-500">Built-in</p>
                      </div>
                      {(isOver || isWarning) && (
                        <span
                          className={`ml-auto inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${
                            isOver ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"
                          }`}
                        >
                          {isOver ? "🚫 Over" : "⚠️ Warning"}
                        </span>
                      )}
                    </div>
                    {budget && (
                      <div className="mt-3">
                        <div className="mb-1 flex justify-between text-xs">
                          <span className="text-slate-500">Budget</span>
                          <span className="text-slate-700">
                            ₹{spentAmount.toLocaleString("en-IN")} / ₹{budget.amount.toLocaleString("en-IN")}
                          </span>
                        </div>
                        <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                          <div
                            className={`h-full rounded-full transition-all ${
                              isOver ? "bg-red-500" : isWarning ? "bg-amber-500" : "bg-slate-900"
                            }`}
                            style={{ width: `${Math.min(budgetPct ?? 0, 100)}%` }}
                          />
                        </div>
                        <p className="mt-1 text-[10px] text-slate-400">{budgetPct}% used</p>
                      </div>
                    )}
                    {stats && (
                      <div className="mt-3 rounded-xl bg-slate-50 p-3">
                        <div className="grid grid-cols-3 gap-2 text-xs">
                          <div>
                            <p className="text-slate-500">Income</p>
                            <p className="font-semibold text-emerald-600">
                              ₹{stats.income.toLocaleString("en-IN")}
                            </p>
                          </div>
                          <div>
                            <p className="text-slate-500">Expenses</p>
                            <p className="font-semibold text-red-500">
                              ₹{stats.expense.toLocaleString("en-IN")}
                            </p>
                          </div>
                          <div>
                            <p className="text-slate-500">Count</p>
                            <p className="font-semibold text-slate-700">
                              {stats.count}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Custom methods */}
          <div className="mt-8">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-slate-700">
                  Custom Methods
                </h3>
                <p className="text-xs text-slate-500">
                  Add your own payment methods for better tracking.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  resetForm();
                  setShowForm(true);
                }}
                className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                + Add Method
              </button>
            </div>

            {customMethods.length === 0 ? (
              <div className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-white py-10 text-center">
                <p className="text-sm text-slate-500">
                  No custom payment methods yet. Add one to personalize your
                  tracking.
                </p>
              </div>
            ) : (
              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {customMethods.map((method) => {
                const stats = analytics.find(
                  (a) => a.method === `custom:${method.id}`
                );
                const budget = budgets.find((b) => b.payment_method === `custom:${method.id}`);
                const spentAmount = spentByMethod[`custom:${method.id}`] ?? 0;
                const budgetPct = budget ? Math.round((spentAmount / budget.amount) * 100) : null;
                const isOver = budgetPct !== null && budgetPct > 100;
                const isWarning = budgetPct !== null && budgetPct >= 80 && budgetPct <= 100;
                return (
                  <div
                    key={method.id}
                    className={`rounded-2xl bg-white p-5 transition hover:shadow-md ${
                      isOver ? "border border-red-200" : isWarning ? "border border-amber-200" : "border border-slate-200"
                    }`}
                  >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div
                            className="flex h-10 w-10 items-center justify-center rounded-xl text-lg"
                            style={{
                              backgroundColor: `${method.color}15`,
                            }}
                          >
                            {method.icon}
                          </div>
                          <div>
                            <p className="font-medium text-slate-950">
                              {method.name}
                            </p>
                            <p className="text-xs text-slate-500">Custom</p>
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <button
                            type="button"
                            onClick={() => startEdit(method)}
                            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                            title="Edit"
                          >
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
                                d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10"
                              />
                            </svg>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(method.id)}
                            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-red-50 hover:text-red-500"
                            title="Delete"
                          >
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
                          </button>
                        </div>
                      </div>

                      {(isOver || isWarning) && (
                        <span
                          className={`ml-auto inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${
                            isOver ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"
                          }`}
                        >
                          {isOver ? "🚫 Over" : "⚠️ Warning"}
                        </span>
                      )}
                      {budget && (
                        <div className="mt-3">
                          <div className="mb-1 flex justify-between text-xs">
                            <span className="text-slate-500">Budget</span>
                            <span className="text-slate-700">
                              ₹{spentAmount.toLocaleString("en-IN")} / ₹{budget.amount.toLocaleString("en-IN")}
                            </span>
                          </div>
                          <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                            <div
                              className={`h-full rounded-full transition-all ${
                                isOver ? "bg-red-500" : isWarning ? "bg-amber-500" : "bg-slate-900"
                              }`}
                              style={{ width: `${Math.min(budgetPct ?? 0, 100)}%` }}
                            />
                          </div>
                          <p className="mt-1 text-[10px] text-slate-400">{budgetPct}% used</p>
                        </div>
                      )}
                      {stats && (
                        <div className="mt-3 rounded-xl bg-slate-50 p-3">
                          <div className="grid grid-cols-3 gap-2 text-xs">
                            <div>
                              <p className="text-slate-500">Income</p>
                              <p className="font-semibold text-emerald-600">
                                ₹{stats.income.toLocaleString("en-IN")}
                              </p>
                            </div>
                            <div>
                              <p className="text-slate-500">Expenses</p>
                              <p className="font-semibold text-red-500">
                                ₹{stats.expense.toLocaleString("en-IN")}
                              </p>
                            </div>
                            <div>
                              <p className="text-slate-500">Count</p>
                              <p className="font-semibold text-slate-700">
                                {stats.count}
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}

      {/* ═══ ANALYTICS TAB ═══ */}
      {activeTab === "analytics" && (
        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Usage breakdown */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6">
            <h3 className="text-lg font-semibold text-slate-950">
              Payment Method Usage
            </h3>
            <p className="mt-0.5 text-xs text-slate-500">
              How you spend and receive money across all methods
            </p>

            {resolvedAnalytics.length === 0 ? (
              <div className="py-12 text-center text-sm text-slate-500">
                No transaction data yet. Add some transactions to see analytics.
              </div>
            ) : (
              <div className="mt-6 space-y-4">
                {resolvedAnalytics
                  .sort((a, b) => b.total - a.total)
                  .map((pm) => {
                    const pct =
                      totalExpense > 0
                        ? (pm.expense / totalExpense) * 100
                        : 0;
                    return (
                      <div key={pm.method}>
                        <div className="mb-1.5 flex items-center justify-between">
                          <span className="text-sm font-medium text-slate-700">
                            {pm.info.icon} {pm.info.label}
                            {pm.info.isCustom && (
                              <span className="ml-1 rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-500">
                                Custom
                              </span>
                            )}
                          </span>
                          <div className="flex items-center gap-3 text-xs">
                            <span className="text-slate-500">
                              {pm.count} txns
                            </span>
                            <span className="font-medium text-slate-950">
                              ₹{pm.total.toLocaleString("en-IN")}
                            </span>
                          </div>
                        </div>
                        <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
                          <div
                            className="h-full rounded-full bg-slate-700 transition-all"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <div className="mt-1 flex justify-between text-[11px] text-slate-400">
                          <span>
                            Income: ₹{pm.income.toLocaleString("en-IN")}
                          </span>
                          <span>
                            Expense: ₹{pm.expense.toLocaleString("en-IN")}
                          </span>
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>

          {/* Expense distribution */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6">
            <h3 className="text-lg font-semibold text-slate-950">
              Expense Distribution
            </h3>
            <p className="mt-0.5 text-xs text-slate-500">
              Share of expenses by payment method
            </p>
            {resolvedAnalytics.length === 0 ? (
              <div className="py-12 text-center text-sm text-slate-500">
                No data yet.
              </div>
            ) : (
              <>
                {/* Stacked bar */}
                <div className="mt-6 h-6 overflow-hidden rounded-full bg-slate-100 flex">
                  {resolvedAnalytics
                    .filter((pm) => pm.expense > 0)
                    .sort((a, b) => b.expense - a.expense)
                    .map((pm, i) => {
                      const pct =
                        totalExpense > 0
                          ? (pm.expense / totalExpense) * 100
                          : 0;
                      const colors = [
                        "bg-slate-700",
                        "bg-slate-500",
                        "bg-slate-400",
                        "bg-slate-300",
                        "bg-slate-200",
                        "bg-slate-600",
                        "bg-slate-100",
                      ];
                      return (
                        <div
                          key={pm.method}
                          className={`h-full transition-all ${colors[i % colors.length]} ${
                            i === 0 ? "rounded-l-full" : ""
                          }`}
                          style={{ width: `${pct}%` }}
                          title={`${pm.info.label}: ₹${pm.expense.toLocaleString("en-IN")} (${Math.round(pct)}%)`}
                        />
                      );
                    })}
                </div>

                {/* Legend */}
                <div className="mt-6 space-y-3">
                  {resolvedAnalytics
                    .filter((pm) => pm.expense > 0)
                    .sort((a, b) => b.expense - a.expense)
                    .map((pm, i) => {
                      const pct =
                        totalExpense > 0
                          ? Math.round((pm.expense / totalExpense) * 100)
                          : 0;
                      const colors = [
                        "bg-slate-700",
                        "bg-slate-500",
                        "bg-slate-400",
                        "bg-slate-300",
                        "bg-slate-200",
                        "bg-slate-600",
                        "bg-slate-100",
                      ];
                      return (
                        <div key={pm.method} className="flex items-center gap-3">
                          <div
                            className={`h-3 w-3 rounded-full ${colors[i % colors.length]}`}
                          />
                          <span className="flex-1 text-sm text-slate-700">
                            {pm.info.icon} {pm.info.label}
                          </span>
                          <span className="text-xs text-slate-500">{pct}%</span>
                          <span className="w-24 text-right text-sm font-medium text-slate-950">
                            ₹{pm.expense.toLocaleString("en-IN")}
                          </span>
                        </div>
                      );
                    })}
                </div>
              </>
            )}
          </div>

          {/* Income by payment method */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 lg:col-span-2">
            <h3 className="text-lg font-semibold text-slate-950">
              Income by Payment Method
            </h3>
            <p className="mt-0.5 text-xs text-slate-500">
              Where your income comes from
            </p>
            {resolvedAnalytics.filter((pm) => pm.income > 0).length === 0 ? (
              <div className="py-12 text-center text-sm text-slate-500">
                No income data yet.
              </div>
            ) : (
              <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {resolvedAnalytics
                  .filter((pm) => pm.income > 0)
                  .sort((a, b) => b.income - a.income)
                  .map((pm) => (
                    <div
                      key={pm.method}
                      className="rounded-xl border border-slate-200 p-4"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{pm.info.icon}</span>
                        <span className="text-sm font-medium text-slate-700">
                          {pm.info.label}
                        </span>
                      </div>
                      <p className="mt-2 text-xl font-bold text-emerald-600">
                        ₹{pm.income.toLocaleString("en-IN")}
                      </p>
                      <p className="mt-1 text-xs text-slate-400">
                        {pm.count} transactions
                        {pm.lastUsed && (
                          <> · Last used {new Date(pm.lastUsed).toLocaleDateString("en-IN")}</>
                        )}
                      </p>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═══ BUDGETS TAB ═══ */}
      {activeTab === "budgets" && (
        <div className="mt-6">
          <PaymentMethodBudgetsClient
            initialBudgets={budgets}
            customPaymentMethods={customMethods}
            spentByMethod={spentByMethod}
            userId={userId}
          />
        </div>
      )}

      {/* ═══ FORM MODAL ═══ */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={resetForm} />
          <div className="relative z-10 w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-950">
                {editingId ? "Edit Payment Method" : "New Payment Method"}
              </h2>
              <button
                type="button"
                onClick={resetForm}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100"
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
              {/* Name */}
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. SBI Debit, Amazon Pay"
                  className="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-900"
                />
              </div>

              {/* Icon */}
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Icon
                </label>
                <div className="flex flex-wrap gap-2">
                  {ICONS.map((i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setIcon(i)}
                      className={`flex h-10 w-10 items-center justify-center rounded-lg text-lg transition ${
                        icon === i
                          ? "bg-slate-900 text-white ring-2 ring-offset-1 ring-slate-900"
                          : "bg-slate-50 text-slate-600 hover:bg-slate-100"
                      }`}
                    >
                      {i}
                    </button>
                  ))}
                </div>
              </div>

              {/* Color */}
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Color
                </label>
                <div className="flex flex-wrap gap-2">
                  {COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setColor(c)}
                      className={`h-8 w-8 rounded-full transition ${
                        color === c ? "ring-2 ring-offset-2 ring-slate-900" : ""
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>

              {/* Preview */}
              <div className="rounded-xl bg-slate-50 p-4">
                <p className="text-xs text-slate-500 mb-2">Preview</p>
                <div className="flex items-center gap-2">
                  <div
                    className="flex h-10 w-10 items-center justify-center rounded-xl text-lg"
                    style={{ backgroundColor: `${color}15` }}
                  >
                    {icon}
                  </div>
                  <span
                    className="rounded-full px-3 py-1.5 text-sm font-medium"
                    style={{ backgroundColor: `${color}15`, color }}
                  >
                    {name || "Payment Method"}
                  </span>
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
                  {loading ? "Saving..." : editingId ? "Update" : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
