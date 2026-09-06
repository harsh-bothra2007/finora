"use client";

interface AnalyticsSummaryProps {
  totalIncome: number;
  totalExpenses: number;
  transactionCount: number;
  topCategory: { name: string; amount: number; color: string } | null;
}

export default function AnalyticsSummary({
  totalIncome,
  totalExpenses,
  transactionCount,
  topCategory,
}: AnalyticsSummaryProps) {
  const savingsRate =
    totalIncome > 0
      ? Math.round(((totalIncome - totalExpenses) / totalIncome) * 100)
      : 0;

  const avgPerTransaction =
    transactionCount > 0 ? Math.round(totalExpenses / transactionCount) : 0;

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {/* Savings Rate */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
          Savings Rate
        </p>
        <p
          className={`mt-2 text-3xl font-bold ${
            savingsRate >= 0 ? "text-emerald-600" : "text-red-500"
          }`}
        >
          {savingsRate}%
        </p>
        <p className="mt-1 text-xs text-slate-500">
          {savingsRate >= 20
            ? "Great job! You're saving well."
            : savingsRate >= 0
              ? "Try to save at least 20%."
              : "You're spending more than you earn."}
        </p>
      </div>

      {/* Transaction Count */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
          Transactions
        </p>
        <p className="mt-2 text-3xl font-bold text-slate-950">
          {transactionCount}
        </p>
        <p className="mt-1 text-xs text-slate-500">this month</p>
      </div>

      {/* Top Spending Category */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
          Top Category
        </p>
        {topCategory ? (
          <>
            <div className="mt-2 flex items-center gap-2">
              <div
                className="h-3 w-3 rounded-full"
                style={{ backgroundColor: topCategory.color }}
              />
              <p className="text-lg font-bold text-slate-950">
                {topCategory.name}
              </p>
            </div>
            <p className="mt-1 text-xs text-slate-500">
              ₹{topCategory.amount.toLocaleString("en-IN")} spent
            </p>
          </>
        ) : (
          <p className="mt-2 text-sm text-slate-500">No data</p>
        )}
      </div>

      {/* Avg per transaction */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
          Avg Expense
        </p>
        <p className="mt-2 text-3xl font-bold text-slate-950">
          ₹{avgPerTransaction.toLocaleString("en-IN")}
        </p>
        <p className="mt-1 text-xs text-slate-500">per transaction</p>
      </div>
    </div>
  );
}
