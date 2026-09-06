import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import DashboardNavbar from "@/components/DashboardNavbar";
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

  const firstName =
    ((user.user_metadata?.name as string) || "").split(" ")[0] ||
    (user.user_metadata?.username as string) ||
    user.email?.split("@")[0] ||
    "User";

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
    <main className="flex-1 space-y-5 overflow-y-auto px-7 py-6">
      <DashboardNavbar userName={firstName} title="Recurring" />

      <RecurringTemplatesClient
          initialTemplates={templates}
          categories={categories}
          userId={user.id}
          customPaymentMethods={(customPmResult.data as CustomPaymentMethod[]) ?? []}
        />
    </main>
  );
}
