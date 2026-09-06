"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  getNextOccurrence,
} from "@/lib/supabase/queries";
import type {
  RecurringTemplateWithCategory,
  Category,
  RecurringFrequency,
  PaymentMethod,
  CustomPaymentMethod,
} from "@/lib/types/database";
import { PAYMENT_METHODS } from "@/lib/types/database";

const FREQUENCIES: { value: RecurringFrequency; label: string }[] = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "yearly", label: "Yearly" },
];

const FREQ_EMOJI: Record<RecurringFrequency, string> = {
  daily: "🔄",
  weekly: "📅",
  monthly: "📆",
  yearly: "🗓️",
};

interface RecurringTemplatesClientProps {
  initialTemplates: RecurringTemplateWithCategory[];
  categories: Category[];
  userId: string;
  customPaymentMethods?: CustomPaymentMethod[];
}

export default function RecurringTemplatesClient({
  initialTemplates,
  categories,
  userId,
  customPaymentMethods = [],
}: RecurringTemplatesClientProps) {
  const [templates, setTemplates] = useState(initialTemplates);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [type, setType] = useState<"income" | "expense">("expense");
  const [categoryId, setCategoryId] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("upi");
  const [frequency, setFrequency] = useState<RecurringFrequency>("monthly");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [filterType, setFilterType] = useState<"all" | "income" | "expense">("all");
  const [generating, setGenerating] = useState(false);
  const [genMessage, setGenMessage] = useState("");

  const filteredTemplates =
    filterType === "all"
      ? templates
      : templates.filter((t) => t.type === filterType);

  const filteredCategories = categories.filter((c) => c.type === type);

  function resetForm() {
    setName("");
    setAmount("");
    setType("expense");
    setCategoryId("");
    setPaymentMethod("upi");
    setFrequency("monthly");
    setStartDate(new Date().toISOString().slice(0, 10));
    setEndDate("");
    setNotes("");
    setEditingId(null);
    setError("");
    setShowForm(false);
  }

  function startEdit(t: RecurringTemplateWithCategory) {
    setEditingId(t.id);
    setName(t.name);
    setAmount(String(t.amount));
    setType(t.type);
    setCategoryId(t.category_id ?? "");
    setPaymentMethod(t.payment_method);
    setFrequency(t.frequency);
    setStartDate(t.start_date);
    setEndDate(t.end_date ?? "");
    setNotes(t.notes);
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!name.trim()) {
      setError("Name is required.");
      return;
    }
    const parsedAmount = parseFloat(amount);
    if (!parsedAmount || parsedAmount <= 0) {
      setError("Amount must be greater than 0.");
      return;
    }
    if (!startDate) {
      setError("Start date is required.");
      return;
    }

    setLoading(true);
    const supabase = createClient();

    try {
      if (editingId) {
        const { data, error: updateError } = await supabase
          .from("recurring_templates")
          .update({
            name: name.trim(),
            amount: parsedAmount,
            type,
            category_id: categoryId || null,
            payment_method: paymentMethod,
            frequency,
            start_date: startDate,
            end_date: endDate || null,
            notes: notes.trim(),
          })
          .eq("id", editingId)
          .select("*, categories(name, icon, color)")
          .single();

        if (updateError) throw updateError;
        setTemplates((prev) =>
          prev.map((t) => (t.id === editingId ? data : t))
        );
      } else {
        const nextDate = getNextOccurrence(startDate, frequency);
        const { data, error: insertError } = await supabase
          .from("recurring_templates")
          .insert({
            user_id: userId,
            name: name.trim(),
            amount: parsedAmount,
            type,
            category_id: categoryId || null,
            payment_method: paymentMethod,
            frequency,
            start_date: startDate,
            end_date: endDate || null,
            next_date: nextDate,
            notes: notes.trim(),
            is_active: true,
          })
          .select("*, categories(name, icon, color)")
          .single();

        if (insertError) throw insertError;
        setTemplates((prev) => [...prev, data]);
      }
      resetForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  async function handleToggleActive(id: string, current: boolean) {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("recurring_templates")
      .update({ is_active: !current })
      .eq("id", id)
      .select("*, categories(name, icon, color)")
      .single();

    if (!error && data) {
      setTemplates((prev) =>
        prev.map((t) => (t.id === id ? data : t))
      );
    }
  }

  async function handleDelete(id: string) {
    const supabase = createClient();
    const { error } = await supabase
      .from("recurring_templates")
      .delete()
      .eq("id", id);
    if (!error) {
      setTemplates((prev) => prev.filter((t) => t.id !== id));
    }
  }

  async function handleGenerateNow() {
    setGenerating(true);
    setGenMessage("");
    try {
      const res = await fetch("/api/recurring/generate", {
        method: "POST",
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(json.error ?? "Failed to generate transactions.");
      }

      // Refresh templates so next_date / is_active reflect the generation
      const supabase = createClient();
      const { data } = await supabase
        .from("recurring_templates")
        .select("*, categories(name, icon, color)")
        .eq("user_id", userId)
        .order("next_date");
      if (data) {
        setTemplates(data as RecurringTemplateWithCategory[]);
      }

      setGenMessage(
        `✅ Generated ${json.generated ?? 0} transaction${json.generated === 1 ? "" : "s"}.`
      );
    } catch (err) {
      setGenMessage(
        err instanceof Error ? err.message : "Something went wrong."
      );
    } finally {
      setGenerating(false);
    }
  }

  const activeCount = templates.filter((t) => t.is_active).length;
  const monthlyTotal = templates
    .filter((t) => t.is_active)
    .reduce((sum, t) => {
      if (t.frequency === "daily") return sum + t.amount * 30;
      if (t.frequency === "weekly") return sum + t.amount * 4;
      if (t.frequency === "monthly") return sum + t.amount;
      return sum + t.amount / 12;
    }, 0);

  return (
    <>
      {/* Summary */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/60">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
          <div>
            <p className="text-sm text-slate-500">Active Templates</p>
            <p className="mt-1 text-3xl font-bold text-slate-950">
              {activeCount}
            </p>
          </div>
          <div>
            <p className="text-sm text-slate-500">Estimated Monthly</p>
            <p className="mt-1 text-3xl font-bold text-slate-950">
              ₹{monthlyTotal.toLocaleString("en-IN")}
            </p>
          </div>
          <div>
            <p className="text-sm text-slate-500">Total Templates</p>
            <p className="mt-1 text-3xl font-bold text-slate-950">
              {templates.length}
            </p>
          </div>
        </div>
      </div>

      {/* Header controls */}
      <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
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
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleGenerateNow}
            disabled={generating}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
          >
            {generating ? "Generating..." : "⚡ Generate Now"}
          </button>
          <button
            type="button"
            onClick={() => {
              resetForm();
              setShowForm(true);
            }}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            + Add Recurring
          </button>
        </div>
      </div>

      {/* Generation feedback */}
      {genMessage && (
        <p className="mt-4 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700">
          {genMessage}
        </p>
      )}

      {/* Form modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={resetForm} />
          <div className="relative z-10 w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-950">
                {editingId ? "Edit Recurring" : "New Recurring Transaction"}
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
              {/* Type toggle */}
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">Type</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => { setType("expense"); setCategoryId(""); }}
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
                    onClick={() => { setType("income"); setCategoryId(""); }}
                    className={`flex-1 rounded-lg px-4 py-2.5 text-sm font-medium transition ${
                      type === "income"
                        ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
                        : "bg-slate-50 text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    Income
                  </button>
                </div>
              </div>

              {/* Name */}
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Rent, Netflix, Salary"
                  className="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-900"
                />
              </div>

              {/* Amount + Frequency */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">Amount (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="5000"
                    className="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-900"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">Frequency</label>
                  <div className="grid grid-cols-2 gap-2">
                    {FREQUENCIES.map((f) => (
                      <button
                        key={f.value}
                        type="button"
                        onClick={() => setFrequency(f.value)}
                        className={`rounded-lg px-3 py-2.5 text-xs font-medium transition ${
                          frequency === f.value
                            ? "bg-slate-900 text-white"
                            : "bg-slate-50 text-slate-600 hover:bg-slate-100"
                        }`}
                      >
                        {FREQ_EMOJI[f.value]} {f.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Category */}
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">Category</label>
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-900"
                >
                  <option value="">No category</option>
                  {filteredCategories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Payment method */}
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">Payment Method</label>
                <div className="flex flex-wrap gap-2">
                  {PAYMENT_METHODS.map((pm) => (
                    <button
                      key={pm.value}
                      type="button"
                      onClick={() => setPaymentMethod(pm.value)}
                      className={`rounded-lg px-3 py-2 text-xs font-medium transition ${
                        paymentMethod === pm.value
                          ? "bg-slate-900 text-white"
                          : "bg-slate-50 text-slate-600 hover:bg-slate-100"
                      }`}
                    >
                      {pm.icon} {pm.label}
                    </button>
                  ))}
                  {customPaymentMethods.map((cm) => {
                    const pmValue: PaymentMethod = `custom:${cm.id}`;
                    return (
                      <button
                        key={cm.id}
                        type="button"
                        onClick={() => setPaymentMethod(pmValue)}
                        className={`rounded-lg px-3 py-2 text-xs font-medium transition ${
                          paymentMethod === pmValue
                            ? "bg-slate-900 text-white"
                            : "bg-slate-50 text-slate-600 hover:bg-slate-100"
                        }`}
                      >
                        {cm.icon} {cm.name}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Start / End dates */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">Start Date</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-900"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">End Date (optional)</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-900"
                  />
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">Notes</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Optional notes..."
                  rows={2}
                  className="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-900 resize-none"
                />
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

      {/* Templates list */}
      {filteredTemplates.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-slate-200 bg-white py-12 text-center">
          <p className="text-sm text-slate-500">
            {templates.length === 0
              ? "No recurring transactions yet. Create one to automate your income or expenses."
              : "No templates match this filter."}
          </p>
        </div>
      ) : (
        <div className="mt-6 space-y-4">
          {filteredTemplates.map((template) => {
            const isOverdue =
              template.is_active && template.next_date <= new Date().toISOString().slice(0, 10);

            return (
              <div
                key={template.id}
                className={`rounded-2xl border bg-white p-6 transition hover:shadow-md ${
                  template.is_active
                    ? "border-slate-200"
                    : "border-slate-200 opacity-60"
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    {template.categories ? (
                      <div
                        className="flex h-10 w-10 items-center justify-center rounded-xl text-sm font-bold"
                        style={{
                          backgroundColor: `${template.categories.color}15`,
                          color: template.categories.color,
                        }}
                      >
                        {template.categories.name.charAt(0).toUpperCase()}
                      </div>
                    ) : (
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-sm font-bold text-slate-500">
                        {FREQ_EMOJI[template.frequency]}
                      </div>
                    )}
                    <div>
                      <p className="font-medium text-slate-950">
                        {template.name}
                      </p>
                      <p className="text-xs text-slate-500">
                        {FREQ_EMOJI[template.frequency]}{" "}
                        <span className="capitalize">{template.frequency}</span>
                        {template.category_id &&
                          template.categories && (
                            <> · {template.categories.name}</>
                          )}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {/* Active toggle */}
                    <button
                      type="button"
                      onClick={() =>
                        handleToggleActive(template.id, template.is_active)
                      }
                      className={`relative h-6 w-11 rounded-full transition ${
                        template.is_active ? "bg-emerald-500" : "bg-slate-300"
                      }`}
                      title={template.is_active ? "Deactivate" : "Activate"}
                    >
                      <span
                        className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition ${
                          template.is_active ? "left-[22px]" : "left-0.5"
                        }`}
                      />
                    </button>
                    <button
                      type="button"
                      onClick={() => startEdit(template)}
                      className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                      title="Edit"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(template.id)}
                      className="rounded-lg p-1.5 text-slate-400 transition hover:bg-red-50 hover:text-red-500"
                      title="Delete"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                      </svg>
                    </button>
                  </div>
                </div>

                {/* Details row */}
                <div className="mt-4 flex flex-wrap items-center gap-4 text-sm">
                  <div>
                    <span className="text-slate-500">Amount: </span>
                    <span
                      className={`font-semibold ${
                        template.type === "income"
                          ? "text-emerald-600"
                          : "text-red-500"
                      }`}
                    >
                      {template.type === "income" ? "+" : "-"}₹
                      {template.amount.toLocaleString("en-IN")}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500">Next: </span>
                    <span
                      className={`font-medium ${
                        isOverdue ? "text-amber-600" : "text-slate-700"
                      }`}
                    >
                      {template.next_date}
                      {isOverdue && " (overdue)"}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500">Since: </span>
                    <span className="text-slate-700">{template.start_date}</span>
                  </div>
                  {template.end_date && (
                    <div>
                      <span className="text-slate-500">Until: </span>
                      <span className="text-slate-700">{template.end_date}</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
