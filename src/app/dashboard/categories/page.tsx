import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import DashboardNavbar from "@/components/DashboardNavbar";
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

  const firstName =
    ((user.user_metadata?.name as string) || "").split(" ")[0] ||
    (user.user_metadata?.username as string) ||
    user.email?.split("@")[0] ||
    "User";

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
    <main className="flex-1 space-y-5 overflow-y-auto px-7 py-6">
      <DashboardNavbar userName={firstName} title="Categories" />

      <CategoriesClient
          initialCategories={categories}
          spendingByCategory={spendingByCategory}
          userId={user.id}
        />
    </main>
  );
}
