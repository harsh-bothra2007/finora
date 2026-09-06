import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getBudgetPeriodWindow } from "@/lib/supabase/queries";
import BudgetsClient from "@/components/BudgetsClient";
import type { BudgetWithCategory, Category } from "@/lib/types/database";

export default async function BudgetsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const [budgetsResult, categoriesResult, transactionsResult] =
    await Promise.all([
      supabase
        .from("budgets")
        .select("*, categories(name, icon, color)")
        .eq("user_id", user.id)
        .order("created_at"),
      supabase
        .from("categories")
        .select("*")
        .eq("user_id", user.id)
        .eq("type", "expense")
        .order("name"),
      supabase
        .from("transactions")
        .select("category_id, amount, date")
        .eq("user_id", user.id)
        .eq("type", "expense"),
    ]);

  // Calculate spent per category — only expenses that fall within each
  // budget's current weekly/monthly/yearly period (anchored at start_date)
  const spentByCategory = new Map<string, number>();
  for (const budget of budgetsResult.data ?? []) {
    const { start, end } = getBudgetPeriodWindow(
      budget.start_date,
      budget.period
    );
    let spent = 0;
    for (const tx of transactionsResult.data ?? []) {
      if (
        tx.category_id === budget.category_id &&
        tx.date >= start &&
        tx.date <= end
      ) {
        spent += Number(tx.amount);
      }
    }
    spentByCategory.set(budget.category_id, spent);
  }

  return (
    <main>
      <div className="mx-auto max-w-7xl px-6 py-10 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight text-slate-950">
            Budgets
          </h1>
          <p className="mt-1 text-slate-600">
            Set spending limits for each category and track your progress.
          </p>
        </div>

        <BudgetsClient
          initialBudgets={(budgetsResult.data as BudgetWithCategory[]) ?? []}
          expenseCategories={(categoriesResult.data as Category[]) ?? []}
          spentByCategory={Object.fromEntries(spentByCategory)}
          userId={user.id}
        />
      </div>
    </main>
  );
}
