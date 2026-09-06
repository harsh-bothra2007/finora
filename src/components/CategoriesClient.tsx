"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Category } from "@/lib/types/database";

const COLORS = [
  "#64748b", "#ef4444", "#f97316", "#eab308", "#22c55e",
  "#14b8a6", "#3b82f6", "#8b5cf6", "#ec4899", "#f43f5e",
];

const ICONS = [
  "tag", "shopping-cart", "utensils", "car", "home", "briefcase",
  "gift", "heart", "book", "music", "plane", "coffee",
];

interface SpendingData {
  thisMonth: number;
  lifetime: number;
  count: number;
  income: number;
  expense: number;
}

interface CategoriesClientProps {
  initialCategories: Category[];
  spendingByCategory?: Record<string, SpendingData>;
  userId: string;
}

export default function CategoriesClient({
  initialCategories,
  spendingByCategory = {},
  userId,
}: CategoriesClientProps) {
  const [categories, setCategories] = useState(initialCategories);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [type, setType] = useState<"income" | "expense">("expense");
  const [color, setColor] = useState("#64748b");
  const [icon, setIcon] = useState("tag");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [filterType, setFilterType] = useState<"all" | "income" | "expense">("all");

  const filteredCategories = filterType === "all"
    ? categories
    : categories.filter((c) => c.type === filterType);

  function resetForm() {
    setName("");
    setType("expense");
    setColor("#64748b");
    setIcon("tag");
    setEditingId(null);
    setError("");
    setShowForm(false);
  }

  function startEdit(cat: Category) {
    setEditingId(cat.id);
    setName(cat.name);
    setType(cat.type);
    setColor(cat.color);
    setIcon(cat.icon);
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!name.trim()) {
      setError("Category name is required.");
      return;
    }

    setLoading(true);
    const supabase = createClient();

    try {
      if (editingId) {
        const { data, error: updateError } = await supabase
          .from("categories")
          .update({ name: name.trim(), type, color, icon })
          .eq("id", editingId)
          .select()
          .single();

        if (updateError) throw updateError;
        setCategories((prev) =>
          prev.map((c) => (c.id === editingId ? data : c))
        );
      } else {
        const { data, error: insertError } = await supabase
          .from("categories")
          .insert({
            user_id: userId,
            name: name.trim(),
            type,
            color,
            icon,
          })
          .select()
          .single();

        if (insertError) throw insertError;
        setCategories((prev) => [...prev, data]);
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
    const { error } = await supabase.from("categories").delete().eq("id", id);
    if (!error) {
      setCategories((prev) => prev.filter((c) => c.id !== id));
    }
  }

  return (
    <>
      {/* Header controls */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
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

        <button
          type="button"
          onClick={() => {
            resetForm();
            setShowForm(true);
          }}
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
        >
          + Add Category
        </button>
      </div>

      {/* Form modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={resetForm} />
          <div className="relative z-10 w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-950">
                {editingId ? "Edit Category" : "New Category"}
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
              {/* Name */}
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Groceries, Salary"
                  className="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-900"
                />
              </div>

              {/* Type */}
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">Type</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setType("expense")}
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
                    onClick={() => setType("income")}
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

              {/* Color */}
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">Color</label>
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

              {/* Icon */}
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">Icon</label>
                <div className="flex flex-wrap gap-2">
                  {ICONS.map((i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setIcon(i)}
                      className={`flex h-9 w-9 items-center justify-center rounded-lg text-xs transition ${
                        icon === i
                          ? "bg-slate-900 text-white"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      }`}
                    >
                      {i.charAt(0).toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>

              {/* Preview */}
              <div className="rounded-xl bg-slate-50 p-4">
                <p className="text-xs text-slate-500 mb-2">Preview</p>
                <span
                  className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium"
                  style={{ backgroundColor: `${color}15`, color }}
                >
                  <span className="text-xs">{icon === "tag" ? "🏷️" : "📌"}</span>
                  {name || "Category Name"}
                </span>
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

      {/* Categories grid */}
      {filteredCategories.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-slate-200 bg-white py-12 text-center">
          <p className="text-sm text-slate-500">
            {categories.length === 0
              ? "No categories yet. Create one to organize your transactions."
              : "No categories match this filter."}
          </p>
        </div>
      ) : (
        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredCategories.map((cat) => {
            const spending = spendingByCategory[cat.id];
            return (
              <div
                key={cat.id}
                className="rounded-2xl border border-slate-200 bg-white p-5 transition hover:shadow-md"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="flex h-10 w-10 items-center justify-center rounded-xl text-sm font-bold"
                      style={{ backgroundColor: `${cat.color}15`, color: cat.color }}
                    >
                      {cat.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-medium text-slate-950">{cat.name}</p>
                      <p className="text-xs text-slate-500 capitalize">{cat.type}</p>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => startEdit(cat)}
                      className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                      title="Edit"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(cat.id)}
                      className="rounded-lg p-1.5 text-slate-400 transition hover:bg-red-50 hover:text-red-500"
                      title="Delete"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                      </svg>
                    </button>
                  </div>
                </div>

                {/* Spending data */}
                {spending && (
                  <div className="mt-3 rounded-xl bg-slate-50 p-3">
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div>
                        <p className="text-slate-500">This month</p>
                        <p className={`font-semibold ${cat.type === "income" ? "text-emerald-600" : "text-red-500"}`}>
                          ₹{spending.thisMonth.toLocaleString("en-IN")}
                        </p>
                      </div>
                      <div>
                        <p className="text-slate-500">Lifetime</p>
                        <p className="font-semibold text-slate-700">
                          ₹{spending.lifetime.toLocaleString("en-IN")}
                        </p>
                      </div>
                      <div>
                        <p className="text-slate-500">Transactions</p>
                        <p className="font-semibold text-slate-700">
                          {spending.count}
                        </p>
                      </div>
                      <div>
                        <p className="text-slate-500">Avg / tx</p>
                        <p className="font-semibold text-slate-700">
                          ₹{spending.count > 0 ? Math.round(spending.lifetime / spending.count).toLocaleString("en-IN") : 0}
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
    </>
  );
}
