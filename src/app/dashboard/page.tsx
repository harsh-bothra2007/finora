import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
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

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const userName =
    user.user_metadata?.name || user.email?.split("@")[0] || "there";

  // Fetch all data in parallel using the SERVER client
  const now = new Date();
  const targetMonth = now.toISOString().slice(0, 7);
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1)
    .toISOString()
    .slice(0, 10);

  const [
    transactionsResult,
    categoriesResult,
    summaryResult,
    budgetsResult,
    monthlyResult,
    savingsResult,
    customPmResult,
  ] = await Promise.all([
    // Recent transactions
    supabase
      .from("transactions")
      .select("*, categories(name, icon, color)")
      .eq("user_id", user.id)
      .order("date", { ascending: false })
      .limit(50),

    // Categories
    supabase
      .from("categories")
      .select("*")
      .eq("user_id", user.id)
      .order("name"),

    // Current month summary
    supabase
      .from("transactions")
      .select("amount, type")
      .eq("user_id", user.id)
      .gte("date", `${targetMonth}-01`)
      .lt("date", `${targetMonth}-31`),

    // Budgets
    supabase
      .from("budgets")
      .select("*, categories(name, icon, color)")
      .eq("user_id", user.id)
      .order("created_at"),

    // Monthly data for chart (last 6 months)
    supabase
      .from("transactions")
      .select("amount, type, date")
      .eq("user_id", user.id)
      .gte("date", sixMonthsAgo)
      .order("date"),

    // Savings goals
    supabase
      .from("savings_goals")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at"),

    // Custom payment methods
    supabase
      .from("custom_payment_methods")
      .select("*")
      .eq("user_id", user.id)
      .order("name"),
  ]);

  // ── Safely extract data ──
  const transactions: TransactionWithCategory[] =
    transactionsResult.data ?? [];
  const categories: Category[] = categoriesResult.data ?? [];
  const savingsGoals: SavingsGoal[] = savingsResult.data ?? [];
  const customPaymentMethods: CustomPaymentMethod[] = (customPmResult.data as CustomPaymentMethod[]) ?? [];

  // Current month income/expenses
  const txData = summaryResult.data ?? [];
  let totalIncome = 0;
  let totalExpenses = 0;
  for (const tx of txData) {
    if (tx.type === "income") {
      totalIncome += Number(tx.amount);
    } else {
      totalExpenses += Number(tx.amount);
    }
  }

  // Lifetime totals (from all transactions)
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

  // ── Expense breakdown by category ──
  const categoryColors = new Map<string, { name: string; color: string }>();
  for (const cat of categories) {
    categoryColors.set(cat.id, { name: cat.name, color: cat.color });
  }

  const expensesByCategoryMap = new Map<string, number>();
  for (const tx of transactions) {
    if (tx.type === "expense" && tx.category_id) {
      const current = expensesByCategoryMap.get(tx.category_id) ?? 0;
      expensesByCategoryMap.set(tx.category_id, current + tx.amount);
    }
  }

  const expensesByCategory = Array.from(expensesByCategoryMap.entries())
    .map(([catId, amount]) => ({
      name: categoryColors.get(catId)?.name ?? "Unknown",
      color: categoryColors.get(catId)?.color ?? "#94a3b8",
      amount,
    }))
    .sort((a, b) => b.amount - a.amount);

  const topCategory = expensesByCategory.length > 0 ? expensesByCategory[0] : null;

  // ── Monthly chart data ──
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
      if (tx.type === "income") {
        entry.income += Number(tx.amount);
      } else {
        entry.expenses += Number(tx.amount);
      }
    }
  }
  const chartData = Array.from(monthlyData.entries()).map(
    ([month, values]) => ({
      month,
      ...values,
    })
  );

  // ── Budget progress ──
  const spentByCategory = new Map<string, number>();
  for (const tx of transactions) {
    if (tx.type === "expense" && tx.category_id) {
      const current = spentByCategory.get(tx.category_id) ?? 0;
      spentByCategory.set(tx.category_id, current + tx.amount);
    }
  }

  return (
    <main>
      <DashboardNavbar userName={userName} />

      <div className="mx-auto max-w-7xl px-6 py-10 lg:px-8">
        {/* Page header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight text-slate-950">
            Dashboard
          </h1>
          <p className="mt-1 text-slate-600">
            Here&apos;s an overview of your finances.
          </p>
        </div>

        {/* Analytics summary cards */}
        <AnalyticsSummary
          totalIncome={totalIncome}
          totalExpenses={totalExpenses}
          transactionCount={txData.length}
          topCategory={topCategory}
        />

        {/* Balance + Recent Transactions (read-only) */}
        <div className="mt-8">
          <DashboardClient
            initialTransactions={transactions}
            categories={categories}
            customPaymentMethods={customPaymentMethods}
            summary={summary}
          />
        </div>

        {/* Charts row: Monthly overview + Expense breakdown */}
        <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <MonthlyChart data={chartData} />
          </div>
          <div>
            <ExpenseBreakdown expensesByCategory={expensesByCategory} />
          </div>
        </div>

        {/* Savings + Budgets row */}
        <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-2">
          {/* Savings Goals */}
          <SavingsOverview goals={savingsGoals} />

          {/* Budget Progress */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-950">
                  Budget Progress
                </h2>
                <p className="mt-0.5 text-xs text-slate-500">
                  This month&apos;s spending limits
                </p>
              </div>
              <a
                href="/dashboard/budgets"
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50"
              >
                Manage →
              </a>
            </div>

            {budgets.length === 0 ? (
              <div className="py-8 text-center">
                <p className="text-sm text-slate-500">
                  No budgets set up yet.
                </p>
              </div>
            ) : (
              <div className="mt-5 space-y-4">
                {budgets.slice(0, 4).map((budget) => {
                  const spent =
                    spentByCategory.get(budget.category_id) ?? 0;
                  const percentage = Math.round(
                    (spent / budget.amount) * 100
                  );
                  const isOver = percentage > 80;

                  return (
                    <div key={budget.id}>
                      <div className="mb-1.5 flex justify-between text-sm">
                        <span className="font-medium text-slate-700">
                          {budget.categories.name}
                        </span>
                        <span className="text-slate-500">
                          ₹{spent.toLocaleString("en-IN")} / ₹
                          {budget.amount.toLocaleString("en-IN")}
                        </span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className={`h-full rounded-full transition-all ${
                            isOver ? "bg-red-500" : "bg-slate-900"
                          }`}
                          style={{
                            width: `${Math.min(percentage, 100)}%`,
                          }}
                        />
                      </div>
                      <p className="mt-1 text-[11px] text-slate-400">
                        {percentage}% used
                        {isOver && (
                          <span className="ml-1 font-medium text-red-500">
                            — over budget
                          </span>
                        )}
                      </p>
                    </div>
                  );
                })}
                {budgets.length > 4 && (
                  <p className="text-center text-xs text-slate-400">
                    +{budgets.length - 4} more
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
