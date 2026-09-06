"use client";

import { useState, useMemo } from "react";
import type {
  TransactionWithCategory,
  Category,
  PaymentMethod,
  CustomPaymentMethod,
} from "@/lib/types/database";
import { resolvePaymentMethod } from "@/lib/types/database";

// ── Helpers ──────────────────────────────────────────────────

const MONTH_SHORT = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];



type Period = "daily" | "weekly" | "monthly" | "yearly";

function periodKey(dateStr: string, period: Period): string {
  const d = new Date(dateStr + "T00:00:00");
  if (period === "daily") return dateStr;
  if (period === "weekly") {
    const day = d.getDay();
    const monday = new Date(d);
    monday.setDate(d.getDate() - ((day + 6) % 7));
    return monday.toISOString().slice(0, 10);
  }
  if (period === "monthly") return dateStr.slice(0, 7);
  return dateStr.slice(0, 4);
}

function formatPeriodLabel(key: string, period: Period): string {
  if (period === "daily") {
    const d = new Date(key + "T00:00:00");
    return `${MONTH_SHORT[d.getMonth()]} ${d.getDate()}`;
  }
  if (period === "weekly") {
    const d = new Date(key + "T00:00:00");
    const end = new Date(d);
    end.setDate(d.getDate() + 6);
    return `${MONTH_SHORT[d.getMonth()]} ${d.getDate()} – ${MONTH_SHORT[end.getMonth()]} ${end.getDate()}`;
  }
  if (period === "monthly") {
    const [y, m] = key.split("-");
    return `${MONTH_SHORT[parseInt(m) - 1]} ${y}`;
  }
  return key;
}

// ── Main Component ──────────────────────────────────────────

interface AnalyticsClientProps {
  transactions: TransactionWithCategory[];
  categories: Category[];
  customPaymentMethods?: CustomPaymentMethod[];
}

export default function AnalyticsClient({
  transactions,
  categories,
  customPaymentMethods = [],
}: AnalyticsClientProps) {
  const [period, setPeriod] = useState<Period>("monthly");
  const [analysisType, setAnalysisType] = useState<
    "overview" | "categories" | "payments" | "compare"
  >("overview");

  // ── Aggregated data by period ──
  const periodData = useMemo(() => {
    const map = new Map<
      string,
      { income: number; expenses: number; count: number }
    >();
    for (const tx of transactions) {
      const key = periodKey(tx.date, period);
      if (!map.has(key)) map.set(key, { income: 0, expenses: 0, count: 0 });
      const entry = map.get(key)!;
      entry.count++;
      if (tx.type === "income") entry.income += tx.amount;
      else entry.expenses += tx.amount;
    }
    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, val]) => ({
        key,
        label: formatPeriodLabel(key, period),
        ...val,
        savings: val.income - val.expenses,
        savingsRate:
          val.income > 0
            ? Math.round(((val.income - val.expenses) / val.income) * 100)
            : 0,
      }));
  }, [transactions, period]);

  // ── Category breakdown ──
  const categoryBreakdown = useMemo(() => {
    const map = new Map<string, { name: string; color: string; income: number; expense: number }>();
    for (const cat of categories) {
      map.set(cat.id, { name: cat.name, color: cat.color, income: 0, expense: 0 });
    }
    for (const tx of transactions) {
      if (!tx.category_id) continue;
      const entry = map.get(tx.category_id);
      if (!entry) continue;
      if (tx.type === "income") entry.income += tx.amount;
      else entry.expense += tx.amount;
    }
    return Array.from(map.values())
      .filter((c) => c.income > 0 || c.expense > 0)
      .sort((a, b) => b.expense - a.expense);
  }, [transactions, categories]);

  // ── Payment method breakdown ──
  const paymentBreakdown = useMemo(() => {
    const map = new Map<PaymentMethod, { income: number; expense: number; count: number }>();
    for (const tx of transactions) {
      let entry = map.get(tx.payment_method);
      if (!entry) {
        entry = { income: 0, expense: 0, count: 0 };
        map.set(tx.payment_method, entry);
      }
      entry.count++;
      if (tx.type === "income") entry.income += tx.amount;
      else entry.expense += tx.amount;
    }
    return Array.from(map.entries())
      .map(([method, data]) => {
        const pmInfo = resolvePaymentMethod(method, customPaymentMethods);
        return {
          method,
          emoji: pmInfo.icon,
          label: pmInfo.label,
          isCustom: pmInfo.isCustom,
          ...data,
        };
      })
      .filter((p) => p.income > 0 || p.expense > 0)
      .sort((a, b) => b.expense - a.expense);
  }, [transactions, customPaymentMethods]);

  // ── Month-to-month comparison ──
  const monthComparison = useMemo(() => {
    if (periodData.length < 2) return null;
    const current = periodData[periodData.length - 1];
    const previous = periodData[periodData.length - 2];
    return { current, previous };
  }, [periodData]);

  // ── Spending trends (moving average) ──
  const spendingTrend = useMemo(() => {
    if (periodData.length < 2) return [];
    const window = Math.min(3, periodData.length);
    return periodData.map((d, i) => {
      const slice = periodData.slice(Math.max(0, i - window + 1), i + 1);
      const avgExpense =
        slice.reduce((sum, s) => sum + s.expenses, 0) / slice.length;
      const avgIncome =
        slice.reduce((sum, s) => sum + s.income, 0) / slice.length;
      return {
        ...d,
        avgExpense: Math.round(avgExpense),
        avgIncome: Math.round(avgIncome),
      };
    });
  }, [periodData]);

  // ── Overall stats ──
  const totalIncome = transactions
    .filter((t) => t.type === "income")
    .reduce((sum, t) => sum + t.amount, 0);
  const totalExpenses = transactions
    .filter((t) => t.type === "expense")
    .reduce((sum, t) => sum + t.amount, 0);
  const overallSavingsRate =
    totalIncome > 0
      ? Math.round(((totalIncome - totalExpenses) / totalIncome) * 100)
      : 0;

  const maxExpense = Math.max(...periodData.map((d) => d.expenses), 1);

  return (
    <>
      {/* Analysis type tabs */}
      <div className="mb-6 flex flex-wrap gap-2">
        {[
          { key: "overview" as const, label: "📊 Overview" },
          { key: "categories" as const, label: "🏷️ Categories" },
          { key: "payments" as const, label: "💳 Payment Methods" },
          { key: "compare" as const, label: "⚖️ Compare" },
        ].map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setAnalysisType(tab.key)}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
              analysisType === tab.key
                ? "bg-slate-900 text-white"
                : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Period selector */}
      <div className="mb-6 flex items-center gap-4">
        <span className="text-sm text-slate-500">Period:</span>
        <div className="flex gap-1 rounded-lg bg-slate-100 p-1">
          {(["daily", "weekly", "monthly", "yearly"] as const).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPeriod(p)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium capitalize transition ${
                period === p
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              {p}
            </button>
          ))}
        </div>
        <span className="text-xs text-slate-400">
          {transactions.length.toLocaleString()} transactions loaded
        </span>
      </div>

      {/* ═══ OVERVIEW TAB ═══ */}
      {analysisType === "overview" && (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              label="Total Income"
              value={`₹${totalIncome.toLocaleString("en-IN")}`}
              color="text-emerald-600"
              sub={`${transactions.filter((t) => t.type === "income").length} transactions`}
            />
            <StatCard
              label="Total Expenses"
              value={`₹${totalExpenses.toLocaleString("en-IN")}`}
              color="text-red-500"
              sub={`${transactions.filter((t) => t.type === "expense").length} transactions`}
            />
            <StatCard
              label="Net Savings"
              value={`₹${(totalIncome - totalExpenses).toLocaleString("en-IN")}`}
              color={totalIncome - totalExpenses >= 0 ? "text-slate-950" : "text-red-500"}
              sub={`${overallSavingsRate}% savings rate`}
            />
            <StatCard
              label="Avg / Period"
              value={`₹${periodData.length > 0 ? Math.round(totalExpenses / periodData.length).toLocaleString("en-IN") : 0}`}
              color="text-slate-950"
              sub={`per ${period === "daily" ? "day" : period === "weekly" ? "week" : period === "monthly" ? "month" : "year"}`}
            />
          </div>

          {/* Bar chart */}
          <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-6">
            <h3 className="text-lg font-semibold text-slate-950">
              Income vs Expenses
            </h3>
            <p className="mt-0.5 text-xs text-slate-500 capitalize">
              {period} breakdown • {periodData.length} periods
            </p>

            <div
              className="mt-6 grid gap-2"
              style={{ gridTemplateColumns: `repeat(${Math.min(periodData.length, 30)}, 1fr)` }}
            >
              {spendingTrend.map((d) => {
                const incH = (d.income / maxExpense) * 100;
                const expH = (d.expenses / maxExpense) * 100;
                return (
                  <div key={d.key} className="flex flex-col items-center group">
                    <div className="flex h-40 w-full items-end justify-center gap-1">
                      <div
                        className="w-full max-w-[20px] rounded-t bg-emerald-500 transition group-hover:bg-emerald-400"
                        style={{ height: `${incH}%`, minHeight: d.income > 0 ? "3px" : "0" }}
                      />
                      <div
                        className="w-full max-w-[20px] rounded-t bg-red-500 transition group-hover:bg-red-400"
                        style={{ height: `${expH}%`, minHeight: d.expenses > 0 ? "3px" : "0" }}
                      />
                    </div>
                    <p className="mt-1.5 text-[9px] text-slate-400 text-center leading-tight">
                      {d.label}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Spending trend line */}
          <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-6">
            <h3 className="text-lg font-semibold text-slate-950">Spending Trend</h3>
            <p className="mt-0.5 text-xs text-slate-500">
              Moving average (last 3 periods) showing spending direction
            </p>
            <div className="mt-4 space-y-3">
              {spendingTrend.slice(-12).map((d) => (
                <div key={d.key} className="flex items-center gap-4">
                  <span className="w-20 flex-shrink-0 text-xs text-slate-500">{d.label}</span>
                  <div className="flex-1">
                    <div className="h-4 overflow-hidden rounded bg-slate-100">
                      <div
                        className="h-full rounded bg-red-400 transition-all"
                        style={{
                          width: `${(d.avgExpense / (maxExpense || 1)) * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                  <span className="w-24 text-right text-xs font-medium text-slate-700">
                    ₹{d.avgExpense.toLocaleString("en-IN")}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Savings rate over time */}
          <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-6">
            <h3 className="text-lg font-semibold text-slate-950">Savings Rate Over Time</h3>
            <p className="mt-0.5 text-xs text-slate-500">
              Percentage of income saved each period
            </p>
            <div className="mt-4 space-y-2">
              {periodData.slice(-12).map((d) => {
                const barWidth = Math.min(Math.abs(d.savingsRate), 100);
                const isPositive = d.savingsRate >= 0;
                return (
                  <div key={d.key} className="flex items-center gap-4">
                    <span className="w-20 flex-shrink-0 text-xs text-slate-500">{d.label}</span>
                    <div className="flex-1 flex items-center">
                      <div className="w-1/2 flex justify-end">
                        {isPositive && (
                          <div
                            className="h-4 rounded-l bg-emerald-400"
                            style={{ width: `${barWidth / 2}%` }}
                          />
                        )}
                      </div>
                      <div className="w-px h-6 bg-slate-300" />
                      <div className="w-1/2">
                        {!isPositive && (
                          <div
                            className="h-4 rounded-r bg-red-400"
                            style={{ width: `${barWidth / 2}%` }}
                          />
                        )}
                      </div>
                    </div>
                    <span
                      className={`w-12 text-right text-xs font-medium ${
                        isPositive ? "text-emerald-600" : "text-red-500"
                      }`}
                    >
                      {d.savingsRate}%
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}

      {/* ═══ CATEGORIES TAB ═══ */}
      {analysisType === "categories" && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          <h3 className="text-lg font-semibold text-slate-950">Spending by Category</h3>
          <p className="mt-0.5 text-xs text-slate-500">All-time breakdown across all categories</p>

          {categoryBreakdown.length === 0 ? (
            <div className="py-12 text-center text-sm text-slate-500">No data yet.</div>
          ) : (
            <div className="mt-6 space-y-4">
              {categoryBreakdown.map((cat) => {
                const total = cat.income + cat.expense;
                const maxCat = categoryBreakdown[0]
                  ? categoryBreakdown[0].expense + categoryBreakdown[0].income
                  : 1;
                const pct = maxCat > 0 ? (total / maxCat) * 100 : 0;
                return (
                  <div key={cat.name}>
                    <div className="mb-1.5 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div
                          className="h-3 w-3 rounded-full"
                          style={{ backgroundColor: cat.color }}
                        />
                        <span className="text-sm font-medium text-slate-700">
                          {cat.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-xs">
                        {cat.expense > 0 && (
                          <span className="text-red-500">
                            -₹{cat.expense.toLocaleString("en-IN")}
                          </span>
                        )}
                        {cat.income > 0 && (
                          <span className="text-emerald-600">
                            +₹{cat.income.toLocaleString("en-IN")}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                      <div className="flex h-full">
                        {cat.expense > 0 && (
                          <div
                            className="h-full rounded-l-full bg-red-400"
                            style={{
                              width: `${(cat.expense / (cat.income + cat.expense || 1)) * pct}%`,
                            }}
                          />
                        )}
                        {cat.income > 0 && (
                          <div
                            className="h-full rounded-r-full bg-emerald-400"
                            style={{
                              width: `${(cat.income / (cat.income + cat.expense || 1)) * pct}%`,
                            }}
                          />
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ═══ PAYMENT METHODS TAB ═══ */}
      {analysisType === "payments" && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Breakdown cards */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6">
            <h3 className="text-lg font-semibold text-slate-950">Payment Method Usage</h3>
            <p className="mt-0.5 text-xs text-slate-500">
              How you spend and receive money
            </p>

            {paymentBreakdown.length === 0 ? (
              <div className="py-12 text-center text-sm text-slate-500">No data yet.</div>
            ) : (
              <div className="mt-6 space-y-4">
                {paymentBreakdown.map((pm) => {
                  const total = pm.income + pm.expense;
                  const totalAll = paymentBreakdown.reduce(
                    (s, p) => s + p.income + p.expense,
                    0
                  );
                  const pct = totalAll > 0 ? (total / totalAll) * 100 : 0;
                  return (
                    <div key={pm.method}>
                      <div className="mb-1.5 flex items-center justify-between">
                        <span className="text-sm font-medium text-slate-700">
                          {pm.emoji} {pm.label}
                        </span>
                        <div className="flex items-center gap-3 text-xs">
                          <span className="text-slate-500">{pm.count} txns</span>
                          <span className="font-medium text-slate-950">
                            ₹{total.toLocaleString("en-IN")}
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
                        <span>Income: ₹{pm.income.toLocaleString("en-IN")}</span>
                        <span>Expense: ₹{pm.expense.toLocaleString("en-IN")}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Pie chart representation */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6">
            <h3 className="text-lg font-semibold text-slate-950">Expense Distribution</h3>
            <p className="mt-0.5 text-xs text-slate-500">
              Share of expenses by payment method
            </p>
            {paymentBreakdown.length === 0 ? (
              <div className="py-12 text-center text-sm text-slate-500">No data yet.</div>
            ) : (
              <>
                {/* Stacked bar */}
                <div className="mt-6 h-6 overflow-hidden rounded-full bg-slate-100 flex">
                  {paymentBreakdown
                    .filter((pm) => pm.expense > 0)
                    .map((pm, i) => {
                      const totalExpense = paymentBreakdown.reduce(
                        (s, p) => s + p.expense,
                        0
                      );
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
                      ];
                      return (
                        <div
                          key={pm.method}
                          className={`h-full transition-all ${colors[i % colors.length]} ${
                            i === 0 ? "rounded-l-full" : ""
                          }`}
                          style={{ width: `${pct}%` }}
                          title={`${pm.label}: ₹${pm.expense.toLocaleString("en-IN")} (${Math.round(pct)}%)`}
                        />
                      );
                    })}
                </div>

                {/* Legend */}
                <div className="mt-6 space-y-3">
                  {paymentBreakdown
                    .filter((pm) => pm.expense > 0)
                    .map((pm, i) => {
                      const totalExpense = paymentBreakdown.reduce(
                        (s, p) => s + p.expense,
                        0
                      );
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
                      ];
                      return (
                        <div key={pm.method} className="flex items-center gap-3">
                          <div
                            className={`h-3 w-3 rounded-full ${colors[i % colors.length]}`}
                          />
                          <span className="flex-1 text-sm text-slate-700">
                            {pm.emoji} {pm.label}
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
        </div>
      )}

      {/* ═══ COMPARE TAB ═══ */}
      {analysisType === "compare" && (
        <>
          {monthComparison ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-6">
              <h3 className="text-lg font-semibold text-slate-950">
                Period Comparison
              </h3>
              <p className="mt-0.5 text-xs text-slate-500">
                Comparing the latest two {period} periods
              </p>

              <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2">
                {/* Current period */}
                <div className="rounded-xl border border-slate-200 p-5">
                  <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
                    Current — {monthComparison.current.label}
                  </p>
                  <div className="mt-3 space-y-2">
                    <CompareRow
                      label="Income"
                      value={monthComparison.current.income}
                      color="text-emerald-600"
                    />
                    <CompareRow
                      label="Expenses"
                      value={monthComparison.current.expenses}
                      color="text-red-500"
                    />
                    <CompareRow
                      label="Savings"
                      value={monthComparison.current.savings}
                      color={
                        monthComparison.current.savings >= 0
                          ? "text-slate-950"
                          : "text-red-500"
                      }
                    />
                    <div className="border-t border-slate-100 pt-2">
                      <CompareRow
                        label="Savings Rate"
                        value={monthComparison.current.savingsRate}
                        isPercentage
                        color={
                          monthComparison.current.savingsRate >= 0
                            ? "text-emerald-600"
                            : "text-red-500"
                        }
                      />
                    </div>
                  </div>
                </div>

                {/* Previous period */}
                <div className="rounded-xl border border-slate-200 p-5">
                  <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
                    Previous — {monthComparison.previous.label}
                  </p>
                  <div className="mt-3 space-y-2">
                    <CompareRow
                      label="Income"
                      value={monthComparison.previous.income}
                      color="text-emerald-600"
                    />
                    <CompareRow
                      label="Expenses"
                      value={monthComparison.previous.expenses}
                      color="text-red-500"
                    />
                    <CompareRow
                      label="Savings"
                      value={monthComparison.previous.savings}
                      color={
                        monthComparison.previous.savings >= 0
                          ? "text-slate-950"
                          : "text-red-500"
                      }
                    />
                    <div className="border-t border-slate-100 pt-2">
                      <CompareRow
                        label="Savings Rate"
                        value={monthComparison.previous.savingsRate}
                        isPercentage
                        color={
                          monthComparison.previous.savingsRate >= 0
                            ? "text-emerald-600"
                            : "text-red-500"
                        }
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Delta cards */}
              <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
                <DeltaCard
                  label="Income Change"
                  current={monthComparison.current.income}
                  previous={monthComparison.previous.income}
                />
                <DeltaCard
                  label="Expense Change"
                  current={monthComparison.current.expenses}
                  previous={monthComparison.previous.expenses}
                  invertColors
                />
                <DeltaCard
                  label="Savings Change"
                  current={monthComparison.current.savings}
                  previous={monthComparison.previous.savings}
                />
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-slate-200 bg-white py-12 text-center">
              <p className="text-sm text-slate-500">
                Need at least 2 periods of data to compare. Add some transactions first.
              </p>
            </div>
          )}
        </>
      )}
    </>
  );
}

// ── Sub-components ──────────────────────────────────────────

function StatCard({
  label,
  value,
  color,
  sub,
}: {
  label: string;
  value: string;
  color: string;
  sub: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
        {label}
      </p>
      <p className={`mt-2 text-2xl font-bold ${color}`}>{value}</p>
      <p className="mt-1 text-xs text-slate-500">{sub}</p>
    </div>
  );
}

function CompareRow({
  label,
  value,
  color,
  isPercentage,
}: {
  label: string;
  value: number;
  color: string;
  isPercentage?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-slate-500">{label}</span>
      <span className={`text-sm font-semibold ${color}`}>
        {isPercentage
          ? `${value}%`
          : `₹${Math.abs(value).toLocaleString("en-IN")}`}
      </span>
    </div>
  );
}

function DeltaCard({
  label,
  current,
  previous,
  invertColors,
}: {
  label: string;
  current: number;
  previous: number;
  invertColors?: boolean;
}) {
  const delta = previous !== 0 ? ((current - previous) / Math.abs(previous)) * 100 : current > 0 ? 100 : 0;
  const isPositive = delta >= 0;
  const isGood = invertColors ? !isPositive : isPositive;

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <div className="mt-2 flex items-baseline gap-2">
        <span
          className={`text-2xl font-bold ${
            isGood ? "text-emerald-600" : "text-red-500"
          }`}
        >
          {isPositive ? "+" : ""}
          {Math.round(delta)}%
        </span>
        <span className="text-xs text-slate-400">
          {previous !== 0
            ? `₹${Math.abs(current - previous).toLocaleString("en-IN")}`
            : "new"}
        </span>
      </div>
    </div>
  );
}
