import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import CategoriesClient from "@/components/CategoriesClient";
import type { Category } from "@/lib/types/database";

export default async function CategoriesPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Fetch categories and all transactions in parallel
  const [categoriesResult, transactionsResult] = await Promise.all([
    supabase
      .from("categories")
      .select("*")
      .eq("user_id", user.id)
      .order("name"),
    supabase
      .from("transactions")
      .select("category_id, amount, type, date")
      .eq("user_id", user.id),
  ]);

  const categories: Category[] = (categoriesResult.data as Category[]) ?? [];
  const transactions = transactionsResult.data ?? [];

  // Compute spending per category (this month + lifetime)
  const now = new Date();
  const targetMonth = now.toISOString().slice(0, 7);

  const spendingByCategory: Record<
    string,
    { thisMonth: number; lifetime: number; count: number; income: number; expense: number }
  > = {};

  for (const cat of categories) {
    spendingByCategory[cat.id] = {
      thisMonth: 0,
      lifetime: 0,
      count: 0,
      income: 0,
      expense: 0,
    };
  }

  for (const tx of transactions) {
    if (!tx.category_id || !spendingByCategory[tx.category_id]) continue;
    const entry = spendingByCategory[tx.category_id];
    entry.lifetime += Number(tx.amount);
    entry.count += 1;
    if (tx.type === "income") entry.income += Number(tx.amount);
    else entry.expense += Number(tx.amount);

    if (tx.date.slice(0, 7) === targetMonth) {
      entry.thisMonth += Number(tx.amount);
    }
  }

  return (
    <main>
      <div className="mx-auto max-w-7xl px-6 py-10 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight text-slate-950">
            Categories
          </h1>
          <p className="mt-1 text-slate-600">
            Manage your income and expense categories. See spending breakdowns
            at a glance.
          </p>
        </div>

        <CategoriesClient
          initialCategories={categories}
          spendingByCategory={spendingByCategory}
          userId={user.id}
        />
      </div>
    </main>
  );
}
