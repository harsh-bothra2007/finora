interface AnalyticsSummaryProps {
  /** Lifetime net balance (income − expenses) */
  totalBalance: number;
  /** Current month income */
  totalIncome: number;
  /** Current month expenses */
  totalExpenses: number;
  /** Savings rate this month, 0–100 */
  savingsRate: number;
}

function inr(n: number): string {
  return `₹${Math.round(n).toLocaleString("en-IN")}`;
}

export default function AnalyticsSummary({
  totalBalance,
  totalIncome,
  totalExpenses,
  savingsRate,
}: AnalyticsSummaryProps) {
  const hasIncome = totalIncome > 0;
  const hasData = totalIncome > 0 || totalExpenses > 0 || totalBalance !== 0;
  const net = totalIncome - totalExpenses;
  const saved = Math.max(net, 0);
  const targetRate = 20;
  const targetSaved = totalIncome * (targetRate / 100);
  const barPct = Math.min(Math.round((savingsRate / targetRate) * 100), 100);

  // Zero reads as ₹0.00 (so empty accounts show a real value, not a dash).
  const fmt = (v: number) => (v === 0 ? "₹0.00" : inr(v));

  return (
    <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {/* Current Balance — the anchor metric */}
      <div className="relative overflow-hidden rounded-xl border-2 border-slate-300 bg-white p-5 shadow-sm ring-1 ring-slate-900/5 transition-shadow hover:shadow-md">
        {/* Top accent keeps it visually primary without adding color noise */}
        <span className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-brand-500 to-brand-600" />
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-900">
            Current Balance
          </span>
          {hasData && net >= 0 && (
            <span className="inline-flex items-center gap-0.5 rounded border border-emerald-200/60 bg-emerald-50 px-1.5 py-0.5 font-mono text-[11px] font-semibold text-emerald-700">
              Savings {savingsRate}%
            </span>
          )}
        </div>
        <div className="mt-3 flex items-baseline justify-between">
          <div>
            <div className="font-mono text-3xl font-bold tracking-tight tabular-nums text-slate-900">
              {fmt(totalBalance)}
            </div>
            <p className="mt-0.5 text-xs font-normal text-slate-500">
              {hasData ? "all-time balance" : "no activity yet"}
            </p>
          </div>
          {hasData && (
            <svg className="h-8 w-16 flex-shrink-0 fill-none stroke-brand-600" viewBox="0 0 80 36">
              <path
                d={
                  totalBalance >= 0
                    ? "M2 28 Q 20 26, 28 18 T 52 13 T 78 4"
                    : "M2 6 Q 20 10, 28 20 T 52 28 T 78 32"
                }
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2.5"
              />
            </svg>
          )}
        </div>
      </div>

      {/* Total Income */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <span className="text-xs font-medium text-slate-500">Total Income</span>
        <div className="mt-2.5">
          <div className="font-mono text-2xl font-bold tracking-tight tabular-nums text-slate-900">
            {fmt(totalIncome)}
          </div>
          <p className="mt-0.5 text-[11px] font-normal text-slate-400">
            {hasIncome ? "earned this month" : "this month"}
          </p>
        </div>
      </div>

      {/* Total Expenses */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <span className="text-xs font-medium text-slate-500">Total Expenses</span>
        <div className="mt-2.5">
          <div className="font-mono text-2xl font-bold tracking-tight tabular-nums text-slate-900">
            {fmt(totalExpenses)}
          </div>
          <p className="mt-0.5 text-[11px] font-normal text-slate-400">
            spent this month
          </p>
        </div>
      </div>

      {/* Savings Rate */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-slate-500">Savings Rate</span>
          <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] font-medium text-slate-500">
            Target {targetRate}%
          </span>
        </div>
        <div className="mt-2.5">
          <div className="flex items-baseline justify-between">
            <div className="font-mono text-2xl font-bold tracking-tight tabular-nums text-slate-900">
              {savingsRate === 0 ? "0%" : `${savingsRate}%`}
            </div>
            {hasData && savingsRate >= targetRate && (
              <span className="font-mono text-xs font-medium text-emerald-600">
                on track
              </span>
            )}
          </div>
          {hasData && totalIncome > 0 ? (
            <>
              <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-brand-600"
                  style={{ width: `${barPct}%` }}
                />
              </div>
              <div className="mt-1 flex items-center justify-between font-mono text-[10px] text-slate-400">
                <span>{inr(saved)} saved</span>
                <span>{inr(Math.max(targetSaved - saved, 0))} to target</span>
              </div>
            </>
          ) : (
            <p className="mt-1 text-[11px] text-slate-400">
              {savingsRate}% of income saved
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
