import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getBudgetPeriodWindow } from "@/lib/supabase/queries";
import DashboardNavbar from "@/components/DashboardNavbar";
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

  const firstName =
    ((user.user_metadata?.name as string) || "").split(" ")[0] ||
    (user.user_metadata?.username as string) ||
    user.email?.split("@")[0] ||
    "User";

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
    <main className="flex-1 space-y-5 overflow-y-auto px-7 py-6">
      <DashboardNavbar userName={firstName} title="Budgets" />

      <BudgetsClient
          initialBudgets={(budgetsResult.data as BudgetWithCategory[]) ?? []}
          expenseCategories={(categoriesResult.data as Category[]) ?? []}
          spentByCategory={Object.fromEntries(spentByCategory)}
          userId={user.id}
        />
    </main>
  );
}
