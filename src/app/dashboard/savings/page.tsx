import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
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

  const { data: goals } = await supabase
    .from("savings_goals")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at");

  return (
    <main>
      <div className="mx-auto max-w-7xl px-6 py-10 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight text-slate-950">
            Savings Goals
          </h1>
          <p className="mt-1 text-slate-600">
            Track your progress towards financial goals.
          </p>
        </div>

        <SavingsGoalsClient initialGoals={(goals as SavingsGoal[]) ?? []} userId={user.id} />
      </div>
    </main>
  );
}
