import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import DashboardNavbar from "@/components/DashboardNavbar";
import DashboardClient from "@/components/DashboardClient";
import MonthlyChart from "@/components/MonthlyChart";
import type {
  TransactionWithCategory,
  Category,
  BudgetWithCategory,
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

  const [transactionsResult, categoriesResult, summaryResult, budgetsResult, monthlyResult] =
    await Promise.all([
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
    ]);

  // Safely extract data
  const transactions: TransactionWithCategory[] =
    transactionsResult.data ?? [];
  const categories: Category[] = categoriesResult.data ?? [];

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
  const summary = {
    totalBalance: totalIncome - totalExpenses,
    totalIncome,
    totalExpenses,
    transactionCount: txData.length,
  };

  const budgets: BudgetWithCategory[] = budgetsResult.data ?? [];

  // Process monthly data for chart
  const monthlyData = new Map<string, { income: number; expenses: number }>();
  // Initialize last 6 months
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
  const chartData = Array.from(monthlyData.entries()).map(([month, values]) => ({
    month,
    ...values,
  }));

  // Calculate spent per category from transactions
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

        {/* Interactive sections: balance, transactions, add/delete */}
        <DashboardClient
          initialTransactions={transactions}
          categories={categories}
          summary={summary}
        />

        {/* Monthly Analytics Chart */}
        <MonthlyChart data={chartData} />

        {/* Budget Progress */}
        <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-950">
              Budget Progress
            </h2>
            <span className="text-sm text-slate-500">This month</span>
          </div>

          {budgets.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-sm text-slate-500">
                No budgets set up yet. Create a budget to track your spending
                limits.
              </p>
            </div>
          ) : (
            <div className="mt-6 space-y-5">
              {budgets.map((budget) => {
                const spent = spentByCategory.get(budget.category_id) ?? 0;
                const percentage = Math.round((spent / budget.amount) * 100);
                const isOver = percentage > 80;

                return (
                  <div key={budget.id}>
                    <div className="mb-2 flex justify-between text-sm">
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
                        style={{ width: `${Math.min(percentage, 100)}%` }}
                      />
                    </div>

                    <p className="mt-1 text-xs text-slate-400">
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
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
