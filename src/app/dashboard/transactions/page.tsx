import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import TransactionsClient from "@/components/TransactionsClient";
import type { TransactionWithCategory, Category } from "@/lib/types/database";

export default async function TransactionsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const [transactionsResult, categoriesResult] = await Promise.all([
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
  ]);

  return (
    <main>
      <div className="mx-auto max-w-7xl px-6 py-10 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight text-slate-950">
            Transactions
          </h1>
          <p className="mt-1 text-slate-600">
            View and manage all your income and expenses.
          </p>
        </div>

        <TransactionsClient
          initialTransactions={(transactionsResult.data as TransactionWithCategory[]) ?? []}
          categories={(categoriesResult.data as Category[]) ?? []}
        />
      </div>
    </main>
  );
}
