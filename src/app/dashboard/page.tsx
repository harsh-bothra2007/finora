import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getBudgetPeriodWindow } from "@/lib/supabase/queries";
import DashboardNavbar from "@/components/DashboardNavbar";
import DashboardClient from "@/components/DashboardClient";
import MonthlyChart from "@/components/MonthlyChart";
import SavingsOverview from "@/components/SavingsOverview";
import ExpenseBreakdown from "@/components/ExpenseBreakdown";
import AnalyticsSummary from "@/components/AnalyticsSummary";
import type {
  TransactionWithCategory,
  Category,
  BudgetWithCategory,
  SavingsGoal,
  CustomPaymentMethod,
} from "@/lib/types/database";

function inr(n: number): string {
  return `₹${Math.round(n).toLocaleString("en-IN")}`;
}

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const userName =
    user.user_metadata?.username ||
    user.user_metadata?.name ||
    user.email?.split("@")[0] ||
    "there";
  const firstName = userName.split(" ")[0];
  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  const now = new Date();
  const targetMonth = now.toISOString().slice(0, 7);
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1)
    .toISOString()
    .slice(0, 10);
  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];
  const currentMonthLabel = `${monthNames[now.getMonth()]} ${now.getFullYear()}`;

  const [
    transactionsResult,
    categoriesResult,
    summaryResult,
    budgetsResult,
    monthlyResult,
    savingsResult,
    customPmResult,
    budgetExpensesResult,
  ] = await Promise.all([
    supabase
      .from("transactions")
      .select("*, categories(name, icon, color)")
      .eq("user_id", user.id)
      .order("date", { ascending: false })
      .limit(50),
    supabase
      .from("categories")
      .select("*")
      .eq("user_id", user.id)
      .order("name"),
    supabase
      .from("transactions")
      .select("amount, type")
      .eq("user_id", user.id)
      .gte("date", `${targetMonth}-01`)
      .lt("date", `${targetMonth}-31`),
    supabase
      .from("budgets")
      .select("*, categories(name, icon, color)")
      .eq("user_id", user.id)
      .order("created_at"),
    supabase
      .from("transactions")
      .select("amount, type, date")
      .eq("user_id", user.id)
      .gte("date", sixMonthsAgo)
      .order("date"),
    supabase
      .from("savings_goals")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at"),
    supabase
      .from("custom_payment_methods")
      .select("*")
      .eq("user_id", user.id)
      .order("name"),
    supabase
      .from("transactions")
      .select("category_id, amount, date")
      .eq("user_id", user.id)
      .eq("type", "expense"),
  ]);

  const transactions: TransactionWithCategory[] =
    transactionsResult.data ?? [];
  const categories: Category[] = categoriesResult.data ?? [];
  const savingsGoals: SavingsGoal[] = savingsResult.data ?? [];
  const customPaymentMethods: CustomPaymentMethod[] =
    (customPmResult.data as CustomPaymentMethod[]) ?? [];

  // Current month income/expenses
  const txData = summaryResult.data ?? [];
  let totalIncome = 0;
  let totalExpenses = 0;
  for (const tx of txData) {
    if (tx.type === "income") totalIncome += Number(tx.amount);
    else totalExpenses += Number(tx.amount);
  }
  const savingsRate =
    totalIncome > 0
      ? Math.max(0, Math.round(((totalIncome - totalExpenses) / totalIncome) * 100))
      : 0;

  // Lifetime totals
  let lifetimeIncome = 0;
  let lifetimeExpenses = 0;
  for (const tx of transactions) {
    if (tx.type === "income") lifetimeIncome += tx.amount;
    else lifetimeExpenses += tx.amount;
  }
  const summary = {
    totalBalance: lifetimeIncome - lifetimeExpenses,
    totalIncome,
    totalExpenses,
  };

  const budgets: BudgetWithCategory[] = budgetsResult.data ?? [];

  // ── Monthly chart data (last 6 months) ──
  const monthlyData = new Map<string, { income: number; expenses: number }>();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = d.toISOString().slice(0, 7);
    monthlyData.set(key, { income: 0, expenses: 0 });
  }
  for (const tx of monthlyResult.data ?? []) {
    const monthKey = tx.date.slice(0, 7);
    if (monthlyData.has(monthKey)) {
      const entry = monthlyData.get(monthKey)!;
      if (tx.type === "income") entry.income += Number(tx.amount);
      else entry.expenses += Number(tx.amount);
    }
  }
  const chartData = Array.from(monthlyData.entries()).map(([month, values]) => ({
    month,
    ...values,
  }));

  // ── Expense breakdown (current month, by category) ──
  const categoriesById = new Map(categories.map((c) => [c.id, c]));
  const expensesByCategoryMap = new Map<string, number>();
  // Rebuild from the recent transactions within the month
  const monthPrefix = targetMonth;
  for (const tx of transactions) {
    if (tx.type === "expense" && tx.date.startsWith(monthPrefix) && tx.category_id) {
      expensesByCategoryMap.set(
        tx.category_id,
        (expensesByCategoryMap.get(tx.category_id) ?? 0) + tx.amount
      );
    }
  }
  const expensesByCategory = Array.from(expensesByCategoryMap.entries())
    .map(([catId, amount]) => ({
      name: categoriesById.get(catId)?.name ?? "Other",
      color: categoriesById.get(catId)?.color ?? "#94a3b8",
      amount,
    }))
    .sort((a, b) => b.amount - a.amount);

  const totalSpent = expensesByCategory.reduce((s, c) => s + c.amount, 0);

  // ── Budgets with current-period spend ──
  const budgetsWithSpend = budgets.map((budget) => {
    const { start, end } = getBudgetPeriodWindow(
      budget.start_date,
      budget.period
    );
    let spent = 0;
    for (const tx of budgetExpensesResult.data ?? []) {
      if (
        tx.category_id === budget.category_id &&
        tx.date >= start &&
        tx.date <= end
      ) {
        spent += Number(tx.amount);
      }
    }
    return {
      budget,
      spent,
      pct: budget.amount > 0 ? Math.round((spent / budget.amount) * 100) : 0,
    };
  });
  budgetsWithSpend.sort((a, b) => b.pct - a.pct);

  // ── Insights (data-driven, safe when empty) ──
  const insights = [];
  // Insight 1: expense trend vs previous month
  const lastMonth = chartData[chartData.length - 2];
  const thisMonth = chartData[chartData.length - 1];
  if (lastMonth && thisMonth && thisMonth.expenses > 0) {
    const delta =
      lastMonth.expenses > 0
        ? ((thisMonth.expenses - lastMonth.expenses) / lastMonth.expenses) * 100
        : 100;
    insights.push({
      tone: delta > 0 ? "amber" : "emerald",
      icon: delta > 0 ? "up" : "down",
      text: (
        <>
          Spending <b>{delta > 0 ? "increased" : "decreased"}</b>{" "}
          <b>{Math.abs(delta).toFixed(0)}%</b> this month compared to last month.
        </>
      ),
    });
  }
  // Insight 2: nearest savings goal progress
  if (savingsGoals.length > 0) {
    const goal = savingsGoals.reduce((best, g) =>
      g.current_amount / g.target_amount > best.current_amount / best.target_amount
        ? g
        : best
    );
    const pct = Math.round((goal.current_amount / goal.target_amount) * 100);
    insights.push({
      tone: "emerald",
      icon: "check",
      text: (
        <>
          &quot;{goal.name}&quot; goal is{" "}
          <b>{pct >= 100 ? "complete" : `${pct}% funded`}</b>
          {goal.deadline &&
            pct < 100 && (
              <>
                {" "}
                with a target of{" "}
                <b>{new Date(goal.deadline).toLocaleDateString("en-IN", { month: "short", year: "numeric" })}</b>
              </>
            )}
          .
        </>
      ),
    });
  }
  // Insight 3: budget at highest utilization
  if (budgetsWithSpend.length > 0) {
    const top = budgetsWithSpend[0];
    insights.push({
      tone: top.pct >= 80 ? "rose" : "slate",
      icon: top.pct >= 80 ? "warn" : "info",
      text: (
        <>
          &quot;{top.budget.categories.name}&quot; budget is at{" "}
          <b>{top.pct}%</b>{" "}
          <b className="font-mono">
            ({inr(Math.max(top.budget.amount - top.spent, 0))} remaining)
          </b>
          .
        </>
      ),
    });
  }

  return (
    <main className="flex-1 space-y-5 overflow-y-auto px-7 py-6">
      <DashboardNavbar userName={firstName || userName} />

      {/* Welcome & controls */}
      <section className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-slate-900">
            {greeting}, {firstName} 👋
          </h2>
          <p className="mt-0.5 text-xs font-normal text-slate-500">
            Here&apos;s how your financial health shapes up for this cycle.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <div className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50">
            <span>{currentMonthLabel}</span>
          </div>
          <a
            href="/dashboard/transactions"
            className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-3.5 py-1.5 text-xs font-medium text-white shadow-sm transition-colors hover:bg-brand-700"
          >
            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path d="M12 4v16m8-8H4" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" />
            </svg>
            Add Transaction
          </a>
        </div>
      </section>

      {/* Insights */}
      {insights.length > 0 && (
        <section className="grid grid-cols-1 gap-3 md:grid-cols-3">
          {insights.map((insight, i) => {
            const toneStyles =
              insight.tone === "emerald"
                ? "border-emerald-100 bg-emerald-50 text-emerald-600"
                : insight.tone === "rose"
                  ? "border-rose-100 bg-rose-50 text-rose-600"
                  : insight.tone === "amber"
                    ? "border-amber-100 bg-amber-50 text-amber-600"
                    : "border-slate-200 bg-slate-50 text-slate-500";
            return (
              <div
                key={i}
                className="flex items-start gap-2.5 rounded-lg border border-slate-200 bg-white p-3 transition-colors hover:border-slate-300"
              >
                <div
                  className={`mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-md border ${toneStyles}`}
                >
                  {insight.icon === "up" ? (
                    <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path d="M8 7h.01M8 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                    </svg>
                  ) : insight.icon === "down" ? (
                    <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path d="M3 17l6-6 4 4 8-8M15 7h6v6" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                    </svg>
                  ) : insight.icon === "check" ? (
                    <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                    </svg>
                  ) : (
                    <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                    </svg>
                  )}
                </div>
                <div className="text-xs leading-relaxed text-slate-600">
                  {insight.text}
                </div>
              </div>
            );
          })}
        </section>
      )}

      {/* Metric cards */}
      <AnalyticsSummary
        totalBalance={summary.totalBalance}
        totalIncome={totalIncome}
        totalExpenses={totalExpenses}
        savingsRate={savingsRate}
      />

      {/* Quick actions */}
      <section className="flex items-center gap-2 overflow-x-auto pb-0.5 text-xs">
        <span className="mr-1 text-[11px] font-medium uppercase tracking-wider text-slate-400">
          Quick Actions:
        </span>
        <a
          href="/dashboard/transactions"
          className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 py-1 font-medium text-slate-600 transition-colors hover:border-slate-300 hover:text-slate-900"
        >
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          + Add Income
        </a>
        <a
          href="/dashboard/transactions"
          className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 py-1 font-medium text-slate-600 transition-colors hover:border-slate-300 hover:text-slate-900"
        >
          <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
          - Add Expense
        </a>
        <a
          href="/dashboard/budgets"
          className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2.5 py-1 font-medium text-slate-600 transition-colors hover:border-slate-300 hover:text-slate-900"
        >
          <svg className="h-3 w-3 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
          </svg>
          Create Budget
        </a>
        <a
          href="/dashboard/savings"
          className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2.5 py-1 font-medium text-slate-600 transition-colors hover:border-slate-300 hover:text-slate-900"
        >
          <svg className="h-3 w-3 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
          </svg>
          Set Savings Goal
        </a>
        <a
          href="/dashboard/recurring"
          className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2.5 py-1 font-medium text-slate-600 transition-colors hover:border-slate-300 hover:text-slate-900"
        >
          <svg className="h-3 w-3 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
          </svg>
          Add Recurring Bill
        </a>
      </section>

      {/* Main grid */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        {/* Left column */}
        <div className="space-y-5 lg:col-span-8">
          <MonthlyChart data={chartData} />
          <DashboardClient
            initialTransactions={transactions}
            categories={categories}
            customPaymentMethods={customPaymentMethods}
            summary={summary}
          />
        </div>

        {/* Right column */}
        <div className="space-y-5 lg:col-span-4">
          <ExpenseBreakdown
            expensesByCategory={
              expensesByCategory.length > 0
                ? expensesByCategory
                : totalExpenses > 0
                  ? [{ name: "Uncategorized", color: "#94a3b8", amount: totalExpenses }]
                  : []
            }
          />

          {/* Active budgets */}
          <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">Active Budgets</h3>
                <p className="text-xs text-slate-400">Limits for {monthNames[now.getMonth()]}</p>
              </div>
              <a
                href="/dashboard/budgets"
                className="text-xs font-medium text-brand-600 hover:underline"
              >
                Manage →
              </a>
            </div>

            {budgetsWithSpend.length === 0 ? (
              <div className="py-6 text-center">
                <p className="text-sm text-slate-500">No budgets set up yet.</p>
              </div>
            ) : (
              <div className="space-y-3.5">
                {budgetsWithSpend.slice(0, 4).map(({ budget, spent, pct }) => {
                  const remaining = budget.amount - spent;
                  const isOver = pct > 100;
                  const isNear = pct >= 80 && pct <= 100;
                  const barColor = isOver ? "bg-rose-500" : isNear ? "bg-amber-500" : "bg-slate-800";
                  return (
                    <div key={budget.id}>
                      <div className="mb-1 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-1.5">
                          <span className="font-medium text-slate-700">
                            {budget.categories.name}
                          </span>
                          {(isNear || isOver) && (
                            <span
                              className={`rounded border px-1 text-[10px] font-semibold ${
                                isOver
                                  ? "border-rose-200/60 bg-rose-50 text-rose-700"
                                  : "border-amber-200/60 bg-amber-50 text-amber-700"
                              }`}
                            >
                              {isOver ? "Over" : `${Math.min(pct, 100)}%`}
                            </span>
                          )}
                        </div>
                        <span className="font-mono text-[11px] text-slate-500">
                          <b className="text-slate-900">{inr(spent)}</b> / {inr(budget.amount)}
                        </span>
                      </div>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                        <div
                          className={`h-full rounded-full ${barColor}`}
                          style={{ width: `${Math.min(pct, 100)}%` }}
                        />
                      </div>
                      <div className="mt-1 flex items-center justify-between text-[10px] text-slate-400">
                        <span className={isOver ? "font-medium text-rose-600" : isNear ? "font-medium text-amber-600" : ""}>
                          {isOver
                            ? `${inr(Math.abs(remaining))} over`
                            : `${pct}% utilized`}
                        </span>
                        <span className="font-mono text-slate-600">
                          {inr(Math.max(remaining, 0))} left
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <SavingsOverview goals={savingsGoals} />

          {/* Spending total caption */}
          {totalSpent > 0 && (
            <p className="px-1 text-center text-[11px] text-slate-400">
              {expensesByCategory.length} expense categor{expensesByCategory.length === 1 ? "y" : "ies"} this month
            </p>
          )}
        </div>
      </div>

      {/* Footer */}
      <footer className="flex flex-col items-center justify-between gap-2 border-t border-slate-200 pt-4 pb-2 text-xs text-slate-400 sm:flex-row">
        <div className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          <span className="font-medium text-slate-600">Data up to date</span>
        </div>
        <div className="flex items-center gap-4 text-slate-500">
          <a href="/dashboard/analytics" className="transition-colors hover:text-slate-900">
            Analytics
          </a>
          <a href="/dashboard/settings" className="transition-colors hover:text-slate-900">
            Settings
          </a>
          <a href="/dashboard/transactions" className="transition-colors hover:text-slate-900">
            Export Ledger
          </a>
        </div>
      </footer>
    </main>
  );
}
