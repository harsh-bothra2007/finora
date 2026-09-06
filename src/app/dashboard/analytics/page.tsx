import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import DashboardNavbar from "@/components/DashboardNavbar";
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

  const firstName =
    ((user.user_metadata?.name as string) || "").split(" ")[0] ||
    (user.user_metadata?.username as string) ||
    user.email?.split("@")[0] ||
    "User";

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
    <main className="flex-1 space-y-5 overflow-y-auto px-7 py-6">
      <DashboardNavbar userName={firstName} title="Analytics" />

      <AnalyticsClient
          transactions={transactions}
          categories={categories}
          customPaymentMethods={(customPmResult.data as CustomPaymentMethod[]) ?? []}
        />
    </main>
  );
}
