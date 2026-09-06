// ============================================================
// DEMO MODE — delete this file to remove the demo account
//
// To disable without deleting code, set NEXT_PUBLIC_DEMO_MODE=false.
//
// To fully remove later once the project is ready:
//   1. Delete this file
//   2. Delete src/app/api/demo/login/route.ts
//   3. Remove the "Try Demo Dashboard" block from
//      src/app/login/page.tsx (marked DEMO-ONLY)
//   4. Optionally delete the demo user from Supabase
//      (email: demo@finora.app)
// ============================================================

import type { SupabaseClient } from "@supabase/supabase-js";

export const DEMO_EMAIL = "demo@finora.app";
export const DEMO_PASSWORD = "Demo@12345";
export const DEMO_USERNAME = "demouser";

export const demoModeEnabled = process.env.NEXT_PUBLIC_DEMO_MODE !== "false";

function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return toISODate(d);
}

function firstOfMonth(): string {
  const d = new Date();
  d.setDate(1);
  return toISODate(d);
}

/**
 * Seed realistic sample data for the demo account so every page has
 * something to show. Called once, right after the demo user is created.
 * The admin client bypasses RLS, so inserts work without a session.
 */
export async function seedDemoData(
  supabase: SupabaseClient,
  userId: string
): Promise<void> {
  const categories = [
    { name: "Salary", icon: "briefcase", color: "#10b981", type: "income" },
    { name: "Freelance", icon: "laptop", color: "#06b6d4", type: "income" },
    { name: "Food & Dining", icon: "utensils", color: "#f97316", type: "expense" },
    { name: "Transport", icon: "car", color: "#3b82f6", type: "expense" },
    { name: "Shopping", icon: "shopping-bag", color: "#ec4899", type: "expense" },
    { name: "Bills & Utilities", icon: "zap", color: "#eab308", type: "expense" },
    { name: "Entertainment", icon: "film", color: "#a855f7", type: "expense" },
    { name: "Subscriptions", icon: "refresh-cw", color: "#6366f1", type: "expense" },
    { name: "Health", icon: "heart", color: "#ef4444", type: "expense" },
    { name: "Other", icon: "tag", color: "#64748b", type: "expense" },
  ];

  const { data: insertedCategories, error: catError } = await supabase
    .from("categories")
    .insert(categories.map((c) => ({ ...c, user_id: userId })))
    .select();

  if (catError || !insertedCategories) return;

  const categoryId = new Map(
    insertedCategories.map((c) => [c.name as string, c.id as string])
  );

  const transactions = [
    { name: "Monthly Salary", amount: 60000, type: "income", category: "Salary", payment_method: "bank_transfer", date: daysAgo(4), notes: "Salary credit" },
    { name: "Freelance project", amount: 8500, type: "income", category: "Freelance", payment_method: "upi", date: daysAgo(6), notes: "" },
    { name: "Groceries", amount: 1450, type: "expense", category: "Food & Dining", payment_method: "upi", date: daysAgo(1), notes: "" },
    { name: "Metro card recharge", amount: 500, type: "expense", category: "Transport", payment_method: "upi", date: daysAgo(2), notes: "" },
    { name: "New headphones", amount: 2499, type: "expense", category: "Shopping", payment_method: "credit_card", date: daysAgo(8), notes: "" },
    { name: "Electricity bill", amount: 1820, type: "expense", category: "Bills & Utilities", payment_method: "upi", date: daysAgo(11), notes: "" },
    { name: "Movie night", amount: 800, type: "expense", category: "Entertainment", payment_method: "upi", date: daysAgo(14), notes: "" },
    { name: "Netflix", amount: 649, type: "expense", category: "Subscriptions", payment_method: "credit_card", date: daysAgo(18), notes: "Monthly sub" },
    { name: "Dinner with friends", amount: 1200, type: "expense", category: "Food & Dining", payment_method: "cash", date: daysAgo(22), notes: "" },
    { name: "Pharmacy", amount: 760, type: "expense", category: "Health", payment_method: "upi", date: daysAgo(27), notes: "" },
    { name: "Monthly rent", amount: 15000, type: "expense", category: "Bills & Utilities", payment_method: "bank_transfer", date: daysAgo(31), notes: "Rent" },
  ];

  await supabase.from("transactions").insert(
    transactions.map((t) => ({
      user_id: userId,
      name: t.name,
      amount: t.amount,
      type: t.type,
      category_id: categoryId.get(t.category) ?? null,
      payment_method: t.payment_method,
      date: t.date,
      notes: t.notes,
    }))
  );

  const foodId = categoryId.get("Food & Dining");
  if (foodId) {
    await supabase.from("budgets").insert({
      user_id: userId,
      category_id: foodId,
      amount: 8000,
      period: "monthly",
      start_date: firstOfMonth(),
    });
  }

  const deadline = new Date();
  deadline.setMonth(deadline.getMonth() + 8);
  await supabase.from("savings_goals").insert({
    user_id: userId,
    name: "Emergency Fund",
    target_amount: 50000,
    current_amount: 12500,
    deadline: toISODate(deadline),
    icon: "🎯",
  });

  await supabase.from("payment_method_budgets").insert({
    user_id: userId,
    payment_method: "upi",
    amount: 20000,
    period: "monthly",
    start_date: firstOfMonth(),
  });
}