"use client";

import { useState, useMemo, useEffect } from "react";
import type { SavingsGoal } from "@/lib/types/database";
import { mockSavingsGoals, inr } from "@/lib/mock-data";
import Modal from "@/components/ui/Modal";
import ConfirmDialog from "@/components/ui/ConfirmDialog";

const GOAL_ICONS = ["🎯", "🏠", "🚗", "✈️", "💻", "📱", "🎓", "💍", "🏖️", "💎", "🏍️", "🛟"];

interface GoalFormState {
  name: string;
  target: string;
  current: string;
  deadline: string;
  icon: string;
}

const emptyForm: GoalFormState = { name: "", target: "", current: "", deadline: "", icon: "🎯" };

type GoalStatus = "on-track" | "at-risk" | "completed";

function getStatus(pct: number, deadline: string | null): GoalStatus {
  if (pct >= 100) return "completed";
  if (!deadline) return "on-track";
  const daysLeft = (new Date(deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
  if (daysLeft < 30 && pct < 80) return "at-risk";
  return "on-track";
}

const STATUS_BADGE: Record<GoalStatus, { label: string; cls: string }> = {
  "on-track": { label: "On Track", cls: "border-emerald-200 bg-emerald-50 text-emerald-700" },
  "at-risk": { label: "At Risk", cls: "border-amber-200 bg-amber-50 text-amber-700" },
  completed: { label: "Completed", cls: "border-emerald-200 bg-emerald-50 text-emerald-700" },
};

export default function SavingsPage() {
  const [goals, setGoals] = useState(mockSavingsGoals);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<GoalFormState>(emptyForm);
  const [error, setError] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [addingToId, setAddingToId] = useState<string | null>(null);
  const [addAmount, setAddAmount] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 600);
    return () => clearTimeout(t);
  }, []);

  const goalsWithStats = useMemo(
    () =>
      goals.map((g) => {
        const remaining = Math.max(0, g.target_amount - g.current_amount);
        const pct = g.target_amount > 0 ? Math.min(100, Math.round((g.current_amount / g.target_amount) * 100)) : 0;
        const status = getStatus(pct, g.deadline);
        let daysLeft = 0;
        if (g.deadline) {
          daysLeft = Math.ceil((new Date(g.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
        }
        return { ...g, remaining, pct, status, daysLeft };
      }),
    [goals]
  );

  const stats = useMemo(() => {
    const totalSaved = goals.reduce((s, g) => s + g.current_amount, 0);
    const totalTarget = goals.reduce((s, g) => s + g.target_amount, 0);
    const active = goalsWithStats.filter((g) => g.status !== "completed").length;
    const completed = goalsWithStats.filter((g) => g.status === "completed").length;
    const overallPct = totalTarget > 0 ? Math.round((totalSaved / totalTarget) * 100) : 0;
    return { totalSaved, totalTarget, active, completed, overallPct };
  }, [goals, goalsWithStats]);

  function openCreate() {
    setForm(emptyForm);
    setEditingId(null);
    setError("");
    setShowForm(true);
  }

  function openEdit(g: SavingsGoal) {
    setEditingId(g.id);
    setForm({ name: g.name, target: String(g.target_amount), current: String(g.current_amount), deadline: g.deadline ?? "", icon: g.icon || "🎯" });
    setError("");
    setShowForm(true);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return setError("Goal name is required.");
    const target = parseFloat(form.target);
    if (!target || target <= 0) return setError("Target amount must be greater than 0.");
    const current = parseFloat(form.current) || 0;
    setError("");
    if (editingId) {
      setGoals((prev) =>
        prev.map((g) =>
          g.id === editingId
            ? { ...g, name: form.name.trim(), target_amount: target, current_amount: current, deadline: form.deadline || null, icon: form.icon }
            : g
        )
      );
    } else {
      const newGoal: SavingsGoal = {
        id: `g${Date.now()}`,
        user_id: "u1",
        name: form.name.trim(),
        target_amount: target,
        current_amount: current,
        deadline: form.deadline || null,
        icon: form.icon,
        created_at: "",
        updated_at: "",
      };
      setGoals((prev) => [...prev, newGoal]);
    }
    setShowForm(false);
    setEditingId(null);
  }

  function handleDelete() {
    if (!deletingId) return;
    setGoals((prev) => prev.filter((g) => g.id !== deletingId));
    setDeletingId(null);
  }

  function handleAddMoney() {
    const amt = parseFloat(addAmount);
    if (!amt || amt <= 0 || !addingToId) return;
    setGoals((prev) =>
      prev.map((g) =>
        g.id === addingToId
          ? { ...g, current_amount: Math.min(g.current_amount + amt, g.target_amount) }
          : g
      )
    );
    setAddingToId(null);
    setAddAmount("");
  }

  return (
    <>
      {/* Page header */}
      <section className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-slate-900">Savings Goals</h2>
          <p className="mt-0.5 text-xs text-slate-500">
            Set targets, track progress, and watch your savings grow.
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
          New Goal
        </button>
      </section>

      {/* Summary */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
          <div>
            <p className="text-sm text-slate-500">Total Saved</p>
            <p className="mt-1 font-mono text-2xl font-bold text-slate-950">{inr(stats.totalSaved)}</p>
          </div>
          <div>
            <p className="text-sm text-slate-500">Total Target</p>
            <p className="mt-1 font-mono text-2xl font-bold text-slate-950">{inr(stats.totalTarget)}</p>
          </div>
          <div>
            <p className="text-sm text-slate-500">Overall Progress</p>
            <p className="mt-1 font-mono text-2xl font-bold text-emerald-600">{stats.overallPct}%</p>
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
              <div className="h-full rounded-full bg-emerald-500" style={{ width: `${stats.overallPct}%` }} />
            </div>
          </div>
          <div>
            <p className="text-sm text-slate-500">Active Goals</p>
            <p className="mt-1 font-mono text-2xl font-bold text-slate-950">{stats.active}</p>
            <p className="text-xs text-slate-400">{stats.completed} completed</p>
          </div>
        </div>
      </div>

      {/* Goals grid */}
      {loading ? (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-44 animate-pulse rounded-xl border border-slate-200 bg-white" />
          ))}
        </div>
      ) : goalsWithStats.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-white px-6 py-14 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-slate-400">
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <p className="mt-3 text-sm font-medium text-slate-700">No savings goals yet</p>
          <p className="mt-1 max-w-xs text-xs leading-relaxed text-slate-500">
            Create a goal to start tracking your progress toward what matters most.
          </p>
          <button
            type="button"
            onClick={openCreate}
            className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-3.5 py-2 text-xs font-medium text-white transition hover:bg-brand-700"
          >
            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path d="M12 4v16m8-8H4" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" />
            </svg>
            New Goal
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {goalsWithStats.map((goal) => {
            const badge = STATUS_BADGE[goal.status];
            const isCompleted = goal.status === "completed";
            return (
              <div
                key={goal.id}
                className={`rounded-xl border bg-white p-5 shadow-sm transition hover:shadow-md ${isCompleted ? "border-emerald-200" : "border-slate-200"}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-50 text-xl">
                      {goal.icon || "🎯"}
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-950">{goal.name}</h3>
                      <div className="mt-0.5 flex items-center gap-2">
                        <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold ${badge.cls}`}>
                          {badge.label}
                        </span>
                        {goal.deadline && !isCompleted && (
                          <span className="text-xs text-slate-400">
                            {goal.daysLeft > 0 ? `${goal.daysLeft} days left` : goal.daysLeft === 0 ? "Due today" : `${Math.abs(goal.daysLeft)} days overdue`}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button type="button" onClick={() => openEdit(goal)} title="Edit" className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600">
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                      </svg>
                    </button>
                    <button type="button" onClick={() => setDeletingId(goal.id)} title="Delete" className="rounded-lg p-1.5 text-slate-400 transition hover:bg-red-50 hover:text-red-500">
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                      </svg>
                    </button>
                  </div>
                </div>

                <div className="mt-4">
                  <div className="mb-2 flex items-center justify-between text-sm">
                    <span className="font-mono text-slate-600">{inr(goal.current_amount)} saved</span>
                    <span className="font-mono text-slate-500">{inr(goal.target_amount)}</span>
                  </div>
                  <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        isCompleted ? "bg-emerald-500" : goal.status === "at-risk" ? "bg-amber-500" : "bg-slate-900"
                      }`}
                      style={{ width: `${goal.pct}%` }}
                    />
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <p className="text-xs text-slate-400">{goal.pct}% complete</p>
                    <p className="text-xs font-medium text-slate-500">{inr(goal.remaining)} to go</p>
                  </div>
                </div>

                {goal.deadline && (
                  <div className="mt-3 flex items-center gap-1.5 text-xs text-slate-400">
                    <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span>
                      {new Date(goal.deadline).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                    </span>
                  </div>
                )}

                {isCompleted ? (
                  <div className="mt-4 rounded-lg bg-emerald-50 px-4 py-3 text-center">
                    <p className="text-base">🎉</p>
                    <p className="mt-0.5 text-sm font-semibold text-emerald-700">Goal completed!</p>
                    <p className="text-xs text-emerald-600">You saved {inr(goal.target_amount)} for {goal.name}</p>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => { setAddingToId(goal.id); setAddAmount(""); }}
                    className="mt-4 w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
                  >
                    + Add Money
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Create/Edit modal */}
      <Modal open={showForm} onClose={() => setShowForm(false)} title={editingId ? "Edit Goal" : "New Savings Goal"}>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">Icon</label>
            <div className="flex flex-wrap gap-2">
              {GOAL_ICONS.map((i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, icon: i }))}
                  className={`flex h-9 w-9 items-center justify-center rounded-lg text-lg transition ${
                    form.icon === i ? "bg-slate-900 ring-2 ring-slate-900" : "bg-slate-100 hover:bg-slate-200"
                  }`}
                >
                  {i}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">Goal name</label>
            <input
              type="text"
              placeholder="e.g. New Laptop, Vacation, Emergency Fund"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-900"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">Target (₹)</label>
              <input
                type="number"
                step="0.01"
                min="1"
                placeholder="50000"
                value={form.target}
                onChange={(e) => setForm((f) => ({ ...f, target: e.target.value }))}
                className="w-full rounded-lg border border-slate-300 px-4 py-3 font-mono text-sm outline-none transition focus:border-slate-900"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">Already saved (₹)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                placeholder="0"
                value={form.current}
                onChange={(e) => setForm((f) => ({ ...f, current: e.target.value }))}
                className="w-full rounded-lg border border-slate-300 px-4 py-3 font-mono text-sm outline-none transition focus:border-slate-900"
              />
            </div>
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Deadline <span className="font-normal text-slate-400">(optional)</span>
            </label>
            <input
              type="date"
              value={form.deadline}
              onChange={(e) => setForm((f) => ({ ...f, deadline: e.target.value }))}
              className="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-900"
            />
          </div>
          {error && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setShowForm(false)} className="flex-1 rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50">
              Cancel
            </button>
            <button type="submit" className="flex-1 rounded-lg bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800">
              {editingId ? "Update" : "Create Goal"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Add money modal */}
      <Modal open={addingToId !== null} onClose={() => { setAddingToId(null); setAddAmount(""); }} title="Add Money" maxWidth="max-w-sm">
        <p className="text-sm text-slate-500">How much do you want to add to this goal?</p>
        <div className="mt-4">
          <input
            type="number"
            step="0.01"
            min="0.01"
            value={addAmount}
            onChange={(e) => setAddAmount(e.target.value)}
            placeholder="Enter amount"
            autoFocus
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAddMoney(); } }}
            className="w-full rounded-lg border border-slate-300 px-4 py-3 font-mono text-sm outline-none transition focus:border-slate-900"
          />
        </div>
        <div className="mt-4 flex gap-3">
          <button type="button" onClick={() => { setAddingToId(null); setAddAmount(""); }} className="flex-1 rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50">
            Cancel
          </button>
          <button
            type="button"
            onClick={handleAddMoney}
            disabled={!addAmount || parseFloat(addAmount) <= 0}
            className="flex-1 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60"
          >
            Add
          </button>
        </div>
      </Modal>

      {/* Delete confirm */}
      <ConfirmDialog
        open={deletingId !== null}
        onClose={() => setDeletingId(null)}
        onConfirm={handleDelete}
        title="Delete savings goal"
        message="Are you sure you want to delete this savings goal? This action cannot be undone."
      />
    </>
  );
}
