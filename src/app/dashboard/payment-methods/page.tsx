import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getBudgetPeriodWindow } from "@/lib/supabase/queries";
import PaymentMethodsClient from "@/components/PaymentMethodsClient";
import type {
  CustomPaymentMethod,
  PaymentMethod,
  PaymentMethodBudget,
} from "@/lib/types/database";

export default async function PaymentMethodsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Fetch custom payment methods, budgets and all transactions in parallel
  const [customMethodsResult, budgetsResult, transactionsResult] =
    await Promise.all([
      supabase
        .from("custom_payment_methods")
        .select("*")
        .eq("user_id", user.id)
        .order("name"),
      supabase
        .from("payment_method_budgets")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at"),
      supabase
        .from("transactions")
        .select("payment_method, amount, type, date")
        .eq("user_id", user.id)
        .order("date", { ascending: false }),
    ]);

  const customMethods: CustomPaymentMethod[] =
    (customMethodsResult.data as CustomPaymentMethod[]) ?? [];
  const budgets: PaymentMethodBudget[] =
    (budgetsResult.data as PaymentMethodBudget[]) ?? [];
  const transactions = transactionsResult.data ?? [];

  // Total spent (expenses) per payment method for budget progress — only
  // expenses inside each budget's current weekly/monthly/yearly period
  // (anchored at start_date)
  const spentByMethod: Record<string, number> = {};
  for (const budget of budgets) {
    const { start, end } = getBudgetPeriodWindow(
      budget.start_date,
      budget.period
    );
    let spent = 0;
    for (const tx of transactions) {
      if (tx.type !== "expense") continue;
      if (
        tx.payment_method === budget.payment_method &&
        tx.date >= start &&
        tx.date <= end
      ) {
        spent += Number(tx.amount);
      }
    }
    spentByMethod[budget.payment_method] = spent;
  }

  // Compute payment method analytics
  const map = new Map<
    string,
    { income: number; expense: number; count: number; dates: string[] }
  >();
  for (const tx of transactions) {
    const pm = tx.payment_method as string;
    if (!map.has(pm))
      map.set(pm, { income: 0, expense: 0, count: 0, dates: [] });
    const entry = map.get(pm)!;
    entry.count++;
    entry.dates.push(tx.date);
    if (tx.type === "income") entry.income += Number(tx.amount);
    else entry.expense += Number(tx.amount);
  }

  const analytics = Array.from(map.entries()).map(([method, data]) => ({
    method: method as PaymentMethod,
    ...data,
    total: data.income + data.expense,
    lastUsed: data.dates[0] ?? null,
  }));

  return (
    <main>
      <div className="mx-auto max-w-7xl px-6 py-10 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight text-slate-950">
            Payment Methods
          </h1>
          <p className="mt-1 text-slate-600">
            Manage your payment methods and analyze spending patterns across
            different payment types.
          </p>
        </div>

        <PaymentMethodsClient
          initialCustomMethods={customMethods}
          analytics={analytics}
          budgets={budgets}
          spentByMethod={spentByMethod}
          userId={user.id}
        />
      </div>
    </main>
  );
}
