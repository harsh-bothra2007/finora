import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import DashboardNavbar from "@/components/DashboardNavbar";
import TransactionsClient from "@/components/TransactionsClient";
import type { TransactionWithCategory, Category, CustomPaymentMethod } from "@/lib/types/database";

export default async function TransactionsPage() {
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

  const [transactionsResult, categoriesResult, customPmResult] = await Promise.all([
    supabase
      .from("transactions")
      .select("*, categories(name, icon, color)")
      .eq("user_id", user.id)
      .order("date", { ascending: false })
      .limit(200),
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

  return (
    <main className="flex-1 space-y-5 overflow-y-auto px-7 py-6">
      <DashboardNavbar userName={firstName} title="Transactions" />

      <TransactionsClient
          initialTransactions={(transactionsResult.data as TransactionWithCategory[]) ?? []}
          categories={(categoriesResult.data as Category[]) ?? []}
          customPaymentMethods={(customPmResult.data as CustomPaymentMethod[]) ?? []}
        />
    </main>
  );
}
