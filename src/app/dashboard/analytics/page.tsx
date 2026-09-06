import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AnalyticsClient from "@/components/AnalyticsClient";
import type { TransactionWithCategory, Category, CustomPaymentMethod } from "@/lib/types/database";

export default async function AnalyticsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Fetch all transactions (last 2 years for robust analytics) and categories
  const twoYearsAgo = new Date(
    new Date().setFullYear(new Date().getFullYear() - 2)
  )
    .toISOString()
    .slice(0, 10);

  const [transactionsResult, categoriesResult, customPmResult] = await Promise.all([
    supabase
      .from("transactions")
      .select("*, categories(name, icon, color)")
      .eq("user_id", user.id)
      .gte("date", twoYearsAgo)
      .order("date", { ascending: false }),
    supabase
      .from("categories")
      .select("*")
      .eq("user_id", user.id)
      .order("name"),
    supabase
      .from("custom_payment_methods")
      .select("*")
      .eq("user_id", user.id)
      .order("name"),
  ]);

  const transactions: TransactionWithCategory[] =
    (transactionsResult.data as TransactionWithCategory[]) ?? [];
  const categories: Category[] = (categoriesResult.data as Category[]) ?? [];

  return (
    <main>
      <div className="mx-auto max-w-7xl px-6 py-10 lg:px-8">
        {/* Page header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight text-slate-950">
            Analytics
          </h1>
          <p className="mt-1 text-slate-600">
            Deep dive into your financial data. Analyze spending patterns, track
            trends, and compare periods.
          </p>
        </div>

        <AnalyticsClient
          transactions={transactions}
          categories={categories}
          customPaymentMethods={(customPmResult.data as CustomPaymentMethod[]) ?? []}
        />
      </div>
    </main>
  );
}
