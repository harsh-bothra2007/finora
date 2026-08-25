import { createClient } from "@/lib/supabase/client";
import type {
  Profile,
  Category,
  Transaction,
  TransactionWithCategory,
  Budget,
  BudgetWithCategory,
  SavingsGoal,
} from "@/lib/types/database";

// ============================================================
// PROFILES
// ============================================================

export async function getProfile(userId: string) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();

  if (error) throw error;
  return data as Profile;
}

export async function updateProfile(
  userId: string,
  updates: Partial<Pick<Profile, "name" | "role">>
) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("profiles")
    .update(updates)
    .eq("id", userId)
    .select()
    .single();

  if (error) throw error;
  return data as Profile;
}

// ============================================================
// CATEGORIES
// ============================================================

export async function getCategories(
  userId: string,
  type?: "income" | "expense"
) {
  const supabase = createClient();
  let query = supabase
    .from("categories")
    .select("*")
    .eq("user_id", userId)
    .order("name");

  if (type) {
    query = query.eq("type", type);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data as Category[];
}

export async function createCategory(
  category: Omit<Category, "id" | "created_at">
) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("categories")
    .insert(category)
    .select()
    .single();

  if (error) throw error;
  return data as Category;
}

export async function deleteCategory(id: string) {
  const supabase = createClient();
  const { error } = await supabase.from("categories").delete().eq("id", id);
  if (error) throw error;
}

// ============================================================
// TRANSACTIONS
// ============================================================

export async function getTransactions(
  userId: string,
  options?: {
    type?: "income" | "expense";
    limit?: number;
    offset?: number;
    from?: string;
    to?: string;
  }
) {
  const supabase = createClient();
  let query = supabase
    .from("transactions")
    .select("*, categories(name, icon, color)")
    .eq("user_id", userId)
    .order("date", { ascending: false });

  if (options?.type) {
    query = query.eq("type", options.type);
  }
  if (options?.from) {
    query = query.gte("date", options.from);
  }
  if (options?.to) {
    query = query.lte("date", options.to);
  }
  if (options?.limit) {
    query = query.range(
      options.offset ?? 0,
      (options.offset ?? 0) + options.limit - 1
    );
  }

  const { data, error } = await query;
  if (error) throw error;
  return data as TransactionWithCategory[];
}

export async function createTransaction(
  transaction: Omit<Transaction, "id" | "created_at" | "updated_at">
) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("transactions")
    .insert(transaction)
    .select("*, categories(name, icon, color)")
    .single();

  if (error) throw error;
  return data as TransactionWithCategory;
}

export async function updateTransaction(
  id: string,
  updates: Partial<
    Pick<Transaction, "name" | "amount" | "type" | "date" | "notes" | "category_id">
  >
) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("transactions")
    .update(updates)
    .eq("id", id)
    .select("*, categories(name, icon, color)")
    .single();

  if (error) throw error;
  return data as TransactionWithCategory;
}

export async function deleteTransaction(id: string) {
  const supabase = createClient();
  const { error } = await supabase.from("transactions").delete().eq("id", id);
  if (error) throw error;
}

// ============================================================
// BUDGETS
// ============================================================

export async function getBudgets(userId: string) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("budgets")
    .select("*, categories(name, icon, color)")
    .eq("user_id", userId)
    .order("created_at");

  if (error) throw error;
  return data as BudgetWithCategory[];
}

export async function createBudget(
  budget: Omit<Budget, "id" | "created_at" | "updated_at">
) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("budgets")
    .insert(budget)
    .select("*, categories(name, icon, color)")
    .single();

  if (error) throw error;
  return data as BudgetWithCategory;
}

export async function updateBudget(
  id: string,
  updates: Partial<Pick<Budget, "amount" | "period" | "start_date">>
) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("budgets")
    .update(updates)
    .eq("id", id)
    .select("*, categories(name, icon, color)")
    .single();

  if (error) throw error;
  return data as BudgetWithCategory;
}

export async function deleteBudget(id: string) {
  const supabase = createClient();
  const { error } = await supabase.from("budgets").delete().eq("id", id);
  if (error) throw error;
}

// ============================================================
// SAVINGS GOALS
// ============================================================

export async function getSavingsGoals(userId: string) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("savings_goals")
    .select("*")
    .eq("user_id", userId)
    .order("created_at");

  if (error) throw error;
  return data as SavingsGoal[];
}

export async function createSavingsGoal(
  goal: Omit<SavingsGoal, "id" | "created_at" | "updated_at">
) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("savings_goals")
    .insert(goal)
    .select()
    .single();

  if (error) throw error;
  return data as SavingsGoal;
}

export async function updateSavingsGoal(
  id: string,
  updates: Partial<
    Pick<SavingsGoal, "name" | "target_amount" | "current_amount" | "deadline" | "icon">
  >
) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("savings_goals")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data as SavingsGoal;
}

export async function deleteSavingsGoal(id: string) {
  const supabase = createClient();
  const { error } = await supabase
    .from("savings_goals")
    .delete()
    .eq("id", id);
  if (error) throw error;
}

// ============================================================
// DASHBOARD SUMMARY
// ============================================================

export async function getDashboardSummary(
  userId: string,
  month?: string // YYYY-MM format
) {
  const supabase = createClient();
  const targetMonth = month ?? new Date().toISOString().slice(0, 7);

  // Fetch all transactions for the month
  const { data: transactions, error } = await supabase
    .from("transactions")
    .select("amount, type")
    .eq("user_id", userId)
    .gte("date", `${targetMonth}-01`)
    .lt("date", `${targetMonth}-31`);

  if (error) throw error;

  let totalIncome = 0;
  let totalExpenses = 0;

  for (const tx of transactions ?? []) {
    if (tx.type === "income") {
      totalIncome += Number(tx.amount);
    } else {
      totalExpenses += Number(tx.amount);
    }
  }

  return {
    totalBalance: totalIncome - totalExpenses,
    totalIncome,
    totalExpenses,
    transactionCount: transactions?.length ?? 0,
  };
}

// Get monthly totals for the last N months (for charts)
export async function getMonthlyTotals(userId: string, months = 6) {
  const supabase = createClient();
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth() - months + 1, 1)
    .toISOString()
    .slice(0, 10);

  const { data, error } = await supabase
    .from("transactions")
    .select("amount, type, date")
    .eq("user_id", userId)
    .gte("date", from)
    .order("date");

  if (error) throw error;

  // Group by month
  const monthly = new Map<
    string,
    { income: number; expenses: number }
  >();

  for (const tx of data ?? []) {
    const monthKey = tx.date.slice(0, 7);
    if (!monthly.has(monthKey)) {
      monthly.set(monthKey, { income: 0, expenses: 0 });
    }
    const entry = monthly.get(monthKey)!;
    if (tx.type === "income") {
      entry.income += Number(tx.amount);
    } else {
      entry.expenses += Number(tx.amount);
    }
  }

  return Array.from(monthly.entries()).map(([month, values]) => ({
    month,
    ...values,
  }));
}
