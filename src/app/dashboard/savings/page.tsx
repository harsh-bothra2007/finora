import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import DashboardNavbar from "@/components/DashboardNavbar";
import SavingsGoalsClient from "@/components/SavingsGoalsClient";
import type { SavingsGoal } from "@/lib/types/database";

export default async function SavingsPage() {
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

  const { data: goals } = await supabase
    .from("savings_goals")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at");

  return (
    <main className="flex-1 space-y-5 overflow-y-auto px-7 py-6">
      <DashboardNavbar userName={firstName} title="Savings Goals" />

      <SavingsGoalsClient initialGoals={(goals as SavingsGoal[]) ?? []} userId={user.id} />
    </main>
  );
}
