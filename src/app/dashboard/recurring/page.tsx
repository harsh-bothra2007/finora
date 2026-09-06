import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import RecurringTemplatesClient from "@/components/RecurringTemplatesClient";
import type {
  RecurringTemplateWithCategory,
  Category,
  CustomPaymentMethod,
} from "@/lib/types/database";

export default async function RecurringPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const [templatesResult, categoriesResult, customPmResult] = await Promise.all([
    supabase
      .from("recurring_templates")
      .select("*, categories(name, icon, color)")
      .eq("user_id", user.id)
      .order("next_date"),
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

  const templates: RecurringTemplateWithCategory[] =
    templatesResult.data ?? [];
  const categories: Category[] = categoriesResult.data ?? [];

  return (
    <main>
      <div className="mx-auto max-w-7xl px-6 py-10 lg:px-8">
        {/* Page header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight text-slate-950">
            Recurring Transactions
          </h1>
          <p className="mt-1 text-slate-600">
            Automate your recurring income and expenses. Transactions are
            generated automatically based on your schedules.
          </p>
        </div>

        <RecurringTemplatesClient
          initialTemplates={templates}
          categories={categories}
          userId={user.id}
          customPaymentMethods={(customPmResult.data as CustomPaymentMethod[]) ?? []}
        />
      </div>
    </main>
  );
}
