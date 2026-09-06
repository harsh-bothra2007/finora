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

function fmtSigned(n: number): string {
  return `${n >= 0 ? "+" : ""}${Math.round(n).toLocaleString("en-IN")}`;
}

export default function AnalyticsSummary({
  totalBalance,
  totalIncome,
  totalExpenses,
  savingsRate,
}: AnalyticsSummaryProps) {
  const net = totalIncome - totalExpenses;
  const saved = Math.max(totalIncome - totalExpenses, 0);
  const targetRate = 20; // healthy savings target
  const targetSaved = totalIncome * (targetRate / 100);
  const barPct = Math.min(Math.round((savingsRate / targetRate) * 100), 100);

  return (
    <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {/* Card 1: Current Balance (primary) */}
      <div className="relative overflow-hidden rounded-xl border-2 border-slate-300 bg-white p-5 shadow-sm ring-1 ring-slate-900/5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-700">
            Current Balance
          </span>
          <span
            className={`inline-flex items-center gap-0.5 rounded border border-emerald-200/60 bg-emerald-50 px-1.5 py-0.5 font-mono text-[11px] font-semibold ${
              net >= 0 ? "text-emerald-700" : "text-rose-700"
            }`}
          >
            {net >= 0 ? "+" : ""}
            {(savingsRate / 100).toFixed(0)}%
          </span>
        </div>
        <div className="mt-3 flex items-baseline justify-between">
          <div>
            <div className="font-mono text-3xl font-bold tracking-tight text-slate-900">
              {inr(net)}
            </div>
            <p className="mt-0.5 text-xs font-normal text-slate-500">
              net this month
            </p>
          </div>
          <svg className="h-8 w-16 flex-shrink-0 fill-none stroke-brand-600" viewBox="0 0 80 36">
            <path
              d={net >= 0 ? "M2 28 Q 20 26, 28 18 T 52 13 T 78 4" : "M2 6 Q 20 10, 28 20 T 52 28 T 78 32"}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2.5"
            />
          </svg>
        </div>
      </div>

      {/* Card 2: Total Income */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-slate-500">Total Income</span>
        </div>
        <div className="mt-2.5">
          <div className="font-mono text-2xl font-bold tracking-tight text-slate-900">
            {inr(totalIncome)}
          </div>
          <p className="mt-0.5 text-[11px] font-normal text-slate-400">
            earned this month
          </p>
        </div>
      </div>

      {/* Card 3: Total Expenses */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-slate-500">Total Expenses</span>
        </div>
        <div className="mt-2.5">
          <div className="font-mono text-2xl font-bold tracking-tight text-slate-900">
            {inr(totalExpenses)}
          </div>
          <p className="mt-0.5 text-[11px] font-normal text-slate-400">
            spent this month
          </p>
        </div>
      </div>

      {/* Card 4: Savings Rate */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-slate-500">Savings Rate</span>
          <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] font-medium text-slate-500">
            Target {targetRate}%
          </span>
        </div>
        <div className="mt-2.5">
          <div className="flex items-baseline justify-between">
            <div className="font-mono text-2xl font-bold tracking-tight text-slate-900">
              {savingsRate}%
            </div>
            <span
              className={`font-mono text-xs font-medium ${
                savingsRate >= targetRate ? "text-emerald-600" : "text-slate-500"
              }`}
            >
              {fmtSigned(savingsRate - targetRate)}%
            </span>
          </div>
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
        </div>
      </div>
    </section>
  );
}
