"use client";

import { useState, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import type { SavingsGoal } from "@/lib/types/database";

interface SavingsGoalsClientProps {
  initialGoals: SavingsGoal[];
  userId: string;
}

export default function SavingsGoalsClient({
  initialGoals,
  userId,
}: SavingsGoalsClientProps) {
  const [goals, setGoals] = useState(initialGoals);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [targetAmount, setTargetAmount] = useState("");
  const [currentAmount, setCurrentAmount] = useState("");
  const [deadline, setDeadline] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [addingToId, setAddingToId] = useState<string | null>(null);
  const [addAmount, setAddAmount] = useState("");

  // Calculate required monthly savings for each goal
  const goalsWithStats = useMemo(() => {
    return goals.map((goal) => {
      const remaining = goal.target_amount - goal.current_amount;
      const percentage = Math.min(
        Math.round((goal.current_amount / goal.target_amount) * 100),
        100
      );

      let requiredPerMonth = 0;
      let monthsLeft = 0;
      if (goal.deadline && remaining > 0) {
        const now = new Date();
        const target = new Date(goal.deadline);
        monthsLeft = Math.max(
          1,
          Math.ceil(
            (target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24 * 30)
          )
        );
        requiredPerMonth = remaining / monthsLeft;
      }

      return {
        ...goal,
        remaining,
        percentage,
        requiredPerMonth,
        monthsLeft,
      };
    });
  }, [goals]);

  function resetForm() {
    setName("");
    setTargetAmount("");
    setCurrentAmount("");
    setDeadline("");
    setEditingId(null);
    setError("");
    setShowForm(false);
  }

  function startEdit(goal: SavingsGoal) {
    setEditingId(goal.id);
    setName(goal.name);
    setTargetAmount(String(goal.target_amount));
    setCurrentAmount(String(goal.current_amount));
    setDeadline(goal.deadline || "");
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!name.trim()) {
      setError("Goal name is required.");
      return;
    }
    const target = parseFloat(targetAmount);
    if (!target || target <= 0) {
      setError("Target amount must be greater than 0.");
      return;
    }
    const current = parseFloat(currentAmount) || 0;

    setLoading(true);
    const supabase = createClient();

    try {
      if (editingId) {
        const { data, error: updateError } = await supabase
          .from("savings_goals")
          .update({
            name: name.trim(),
            target_amount: target,
            current_amount: current,
            deadline: deadline || null,
          })
          .eq("id", editingId)
          .select()
          .single();

        if (updateError) throw updateError;
        setGoals((prev) =>
          prev.map((g) => (g.id === editingId ? data : g))
        );
      } else {
        const { data, error: insertError } = await supabase
          .from("savings_goals")
          .insert({
            user_id: userId,
            name: name.trim(),
            target_amount: target,
            current_amount: current,
            deadline: deadline || null,
          })
          .select()
          .single();

        if (insertError) throw insertError;
        setGoals((prev) => [...prev, data]);
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
      .from("savings_goals")
      .delete()
      .eq("id", id);
    if (!error) {
      setGoals((prev) => prev.filter((g) => g.id !== id));
    }
  }

  async function handleAddMoney(id: string) {
    const amount = parseFloat(addAmount);
    if (!amount || amount <= 0) return;

    const supabase = createClient();
    const goal = goals.find((g) => g.id === id);
    if (!goal) return;

    const newAmount = Math.min(goal.current_amount + amount, goal.target_amount);
    const { data, error } = await supabase
      .from("savings_goals")
      .update({ current_amount: newAmount })
      .eq("id", id)
      .select()
      .single();

    if (!error && data) {
      setGoals((prev) => prev.map((g) => (g.id === id ? data : g)));
    }
    setAddingToId(null);
    setAddAmount("");
  }

  const totalSaved = goals.reduce((sum, g) => sum + g.current_amount, 0);
  const totalTarget = goals.reduce((sum, g) => sum + g.target_amount, 0);

  return (
    <>
      {/* Summary card */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/60">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
          <div>
            <p className="text-sm text-slate-500">Total Saved</p>
            <p className="mt-1 text-3xl font-bold text-slate-950">
              ₹{totalSaved.toLocaleString("en-IN")}
            </p>
          </div>
          <div>
            <p className="text-sm text-slate-500">Total Target</p>
            <p className="mt-1 text-3xl font-bold text-slate-950">
              ₹{totalTarget.toLocaleString("en-IN")}
            </p>
          </div>
          <div>
            <p className="text-sm text-slate-500">Overall Progress</p>
            <p className="mt-1 text-3xl font-bold text-emerald-600">
              {totalTarget > 0
                ? Math.round((totalSaved / totalTarget) * 100)
                : 0}
              %
            </p>
          </div>
        </div>
      </div>

      {/* Header */}
      <div className="mt-8 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-950">Your Goals</h2>
        <button
          type="button"
          onClick={() => {
            resetForm();
            setShowForm(true);
          }}
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
        >
          + New Goal
        </button>
      </div>

      {/* Form modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={resetForm} />
          <div className="relative z-10 w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-950">
                {editingId ? "Edit Goal" : "New Savings Goal"}
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
                <label className="mb-2 block text-sm font-medium text-slate-700">Goal Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. New Laptop, Vacation, Emergency Fund"
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
                    value={targetAmount}
                    onChange={(e) => setTargetAmount(e.target.value)}
                    placeholder="50000"
                    className="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-900"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">Already Saved (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={currentAmount}
                    onChange={(e) => setCurrentAmount(e.target.value)}
                    placeholder="0"
                    className="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Deadline <span className="font-normal text-slate-400">(optional)</span>
                </label>
                <input
                  type="date"
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-900"
                />
                {deadline && parseFloat(targetAmount) > 0 && (
                  <p className="mt-2 text-xs text-slate-500">
                    You need to save{" "}
                    <span className="font-medium text-slate-900">
                      ₹
                      {(
                        (parseFloat(targetAmount) - (parseFloat(currentAmount) || 0)) /
                        Math.max(
                          1,
                          Math.ceil(
                            (new Date(deadline).getTime() - Date.now()) /
                              (1000 * 60 * 60 * 24 * 30)
                          )
                        )
                      ).toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                    </span>{" "}
                    / month to reach this goal
                  </p>
                )}
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
                  {loading ? "Saving..." : editingId ? "Update" : "Create Goal"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add money modal */}
      {addingToId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => { setAddingToId(null); setAddAmount(""); }} />
          <div className="relative z-10 w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
            <h3 className="text-lg font-semibold text-slate-950">Add Money</h3>
            <p className="mt-1 text-sm text-slate-500">
              How much do you want to add to this goal?
            </p>
            <div className="mt-4">
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={addAmount}
                onChange={(e) => setAddAmount(e.target.value)}
                placeholder="Enter amount"
                className="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-900"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleAddMoney(addingToId);
                }}
              />
            </div>
            <div className="mt-4 flex gap-3">
              <button
                type="button"
                onClick={() => { setAddingToId(null); setAddAmount(""); }}
                className="flex-1 rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleAddMoney(addingToId)}
                disabled={!addAmount || parseFloat(addAmount) <= 0}
                className="flex-1 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60"
              >
                Add
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Goals grid */}
      {goals.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-slate-200 bg-white py-12 text-center">
          <p className="text-sm text-slate-500">
            No savings goals yet. Create one to start tracking your progress.
          </p>
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
          {goalsWithStats.map((goal) => (
            <div
              key={goal.id}
              className="rounded-2xl border border-slate-200 bg-white p-6 transition hover:shadow-md"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-slate-950">
                    {goal.name}
                  </h3>
                  {goal.deadline && (
                    <p className="mt-0.5 text-xs text-slate-500">
                      Target: {new Date(goal.deadline).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </p>
                  )}
                </div>
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => startEdit(goal)}
                    className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                    title="Edit"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(goal.id)}
                    className="rounded-lg p-1.5 text-slate-400 transition hover:bg-red-50 hover:text-red-500"
                    title="Delete"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Progress bar */}
              <div className="mt-4">
                <div className="mb-2 flex justify-between text-sm">
                  <span className="text-slate-600">
                    ₹{goal.current_amount.toLocaleString("en-IN")} saved
                  </span>
                  <span className="text-slate-500">
                    ₹{goal.target_amount.toLocaleString("en-IN")}
                  </span>
                </div>
                <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className={`h-full rounded-full transition-all ${
                      goal.percentage >= 100
                        ? "bg-emerald-500"
                        : goal.percentage >= 50
                          ? "bg-slate-900"
                          : "bg-slate-600"
                    }`}
                    style={{ width: `${goal.percentage}%` }}
                  />
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <p className="text-xs text-slate-400">{goal.percentage}% complete</p>
                  {goal.requiredPerMonth > 0 && goal.percentage < 100 && (
                    <p className="text-xs text-slate-500">
                      ₹{goal.requiredPerMonth.toLocaleString("en-IN", { maximumFractionDigits: 0 })}/mo needed
                      {" "}({goal.monthsLeft} months left)
                    </p>
                  )}
                </div>
              </div>

              {/* Add money button */}
              {goal.percentage < 100 && (
                <button
                  type="button"
                  onClick={() => {
                    setAddingToId(goal.id);
                    setAddAmount("");
                  }}
                  className="mt-4 w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
                >
                  + Add Money
                </button>
              )}

              {goal.percentage >= 100 && (
                <div className="mt-4 rounded-lg bg-emerald-50 px-4 py-2.5 text-center text-sm font-medium text-emerald-700">
                  🎉 Goal reached!
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </>
  );
}
