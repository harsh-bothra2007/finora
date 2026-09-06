import { createClient } from "@/lib/supabase/client";
import type {
  Profile,
  Category,
  Transaction,
  TransactionWithCategory,
  Budget,
  BudgetWithCategory,
  SavingsGoal,
  RecurringTemplate,
  RecurringTemplateWithCategory,
  RecurringFrequency,
  CustomPaymentMethod,
  PaymentMethod,
  PaymentMethodBudget,
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
    Pick<Transaction, "name" | "amount" | "type" | "date" | "notes" | "category_id" | "payment_method">
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
// CUSTOM PAYMENT METHODS
// ============================================================

export async function getCustomPaymentMethods(userId: string) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("custom_payment_methods")
    .select("*")
    .eq("user_id", userId)
    .order("name");

  if (error) throw error;
  return data as CustomPaymentMethod[];
}

export async function createCustomPaymentMethod(
  method: Omit<CustomPaymentMethod, "id" | "created_at">
) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("custom_payment_methods")
    .insert(method)
    .select()
    .single();

  if (error) throw error;
  return data as CustomPaymentMethod;
}

export async function updateCustomPaymentMethod(
  id: string,
  updates: Partial<Pick<CustomPaymentMethod, "name" | "icon" | "color">>
) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("custom_payment_methods")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data as CustomPaymentMethod;
}

export async function deleteCustomPaymentMethod(id: string) {
  const supabase = createClient();
  const { error } = await supabase
    .from("custom_payment_methods")
    .delete()
    .eq("id", id);
  if (error) throw error;
}

// ============================================================
// PAYMENT METHOD BUDGETS
// ============================================================

export async function getPaymentMethodBudgets(userId: string) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("payment_method_budgets")
    .select("*")
    .eq("user_id", userId)
    .order("created_at");

  if (error) throw error;
  return data as PaymentMethodBudget[];
}

export async function createPaymentMethodBudget(
  budget: Omit<PaymentMethodBudget, "id" | "created_at" | "updated_at">
) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("payment_method_budgets")
    .insert(budget)
    .select()
    .single();

  if (error) throw error;
  return data as PaymentMethodBudget;
}

export async function updatePaymentMethodBudget(
  id: string,
  updates: Partial<Pick<PaymentMethodBudget, "payment_method" | "amount" | "period" | "start_date">>
) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("payment_method_budgets")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data as PaymentMethodBudget;
}

export async function deletePaymentMethodBudget(id: string) {
  const supabase = createClient();
  const { error } = await supabase
    .from("payment_method_budgets")
    .delete()
    .eq("id", id);
  if (error) throw error;
}

// ============================================================
// PAYMENT METHOD ANALYTICS
// ============================================================

export async function getPaymentMethodAnalytics(userId: string) {
  const supabase = createClient();
  const { data: transactions, error } = await supabase
    .from("transactions")
    .select("payment_method, amount, type, date")
    .eq("user_id", userId)
    .order("date", { ascending: false });

  if (error) throw error;

  // Group by payment_method
  const map = new Map<string, { income: number; expense: number; count: number; dates: string[] }>();
  for (const tx of transactions ?? []) {
    const pm = tx.payment_method as string;
    if (!map.has(pm)) map.set(pm, { income: 0, expense: 0, count: 0, dates: [] });
    const entry = map.get(pm)!;
    entry.count++;
    entry.dates.push(tx.date);
    if (tx.type === "income") entry.income += Number(tx.amount);
    else entry.expense += Number(tx.amount);
  }

  return Array.from(map.entries()).map(([method, data]) => ({
    method: method as PaymentMethod,
    ...data,
    total: data.income + data.expense,
    lastUsed: data.dates[0] ?? null,
  }));
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

// ============================================================
// BUDGET PERIOD WINDOWS
// ============================================================

export type BudgetPeriod = "weekly" | "monthly" | "yearly";

export interface BudgetPeriodWindow {
  /** Inclusive start date (YYYY-MM-DD) of the current period */
  start: string;
  /** Inclusive end date (YYYY-MM-DD) of the current period */
  end: string;
}

function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * Advance a YYYY-MM-DD date by one budget period (exclusive end of the
 * previous window). Uses UTC date math so day boundaries never drift.
 */
function addPeriodUtc(dateStr: string, period: BudgetPeriod): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  let next: number;
  switch (period) {
    case "weekly":
      next = Date.UTC(y, m - 1, d) + 7 * 24 * 60 * 60 * 1000;
      break;
    case "monthly":
      // JS normalizes overflow (e.g. Jan 31 + 1 month -> Mar 2/3), keeping windows contiguous
      next = Date.UTC(y, m, d);
      break;
    case "yearly":
      next = Date.UTC(y + 1, m - 1, d);
      break;
  }
  return new Date(next).toISOString().slice(0, 10);
}

/**
 * Compute the current period window for a budget, anchored at its
 * start_date. E.g. a monthly budget starting 2026-01-15 covers
 * 01-15..02-14, 02-15..03-14, and so on; this returns the window that
 * contains today. Budget progress should only count expenses whose date
 * falls inside this window.
 */
export function getBudgetPeriodWindow(
  startDate: string,
  period: BudgetPeriod,
  now: Date = new Date()
): BudgetPeriodWindow {
  const today = toISODate(now);
  let start = startDate;
  let end = addPeriodUtc(start, period); // exclusive end

  // Advance windows until today falls inside [start, end)
  let guard = 0;
  while (end <= today && guard < 2000) {
    start = end;
    end = addPeriodUtc(start, period);
    guard++;
  }

  // Convert the exclusive end to an inclusive end date
  const endInclusive = new Date(
    new Date(end + "T00:00:00Z").getTime() - 24 * 60 * 60 * 1000
  )
    .toISOString()
    .slice(0, 10);

  return { start, end: endInclusive };
}

// ============================================================
// RECURRING TEMPLATES
// ============================================================

/**
 * Calculate the next occurrence date based on frequency.
 */
export function getNextOccurrence(
  fromDate: string,
  frequency: RecurringFrequency
): string {
  const d = new Date(fromDate);
  switch (frequency) {
    case "daily":
      d.setDate(d.getDate() + 1);
      break;
    case "weekly":
      d.setDate(d.getDate() + 7);
      break;
    case "monthly":
      d.setMonth(d.getMonth() + 1);
      break;
    case "yearly":
      d.setFullYear(d.getFullYear() + 1);
      break;
  }
  return d.toISOString().slice(0, 10);
}

export async function getRecurringTemplates(userId: string) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("recurring_templates")
    .select("*, categories(name, icon, color)")
    .eq("user_id", userId)
    .order("next_date");

  if (error) throw error;
  return data as RecurringTemplateWithCategory[];
}

export async function createRecurringTemplate(
  template: Omit<RecurringTemplate, "id" | "created_at" | "updated_at" | "next_date" | "is_active">
) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("recurring_templates")
    .insert({
      ...template,
      next_date: template.start_date,
      is_active: true,
    })
    .select("*, categories(name, icon, color)")
    .single();

  if (error) throw error;
  return data as RecurringTemplateWithCategory;
}

export async function updateRecurringTemplate(
  id: string,
  updates: Partial<Pick<RecurringTemplate, "name" | "amount" | "type" | "category_id" | "payment_method" | "frequency" | "start_date" | "end_date" | "notes" | "is_active">>
) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("recurring_templates")
    .update(updates)
    .eq("id", id)
    .select("*, categories(name, icon, color)")
    .single();

  if (error) throw error;
  return data as RecurringTemplateWithCategory;
}

export async function deleteRecurringTemplate(id: string) {
  const supabase = createClient();
  const { error } = await supabase
    .from("recurring_templates")
    .delete()
    .eq("id", id);
  if (error) throw error;
}

/**
 * Generate transactions from recurring templates whose next_date <= today.
 * Returns the number of transactions created.
 */
export async function generateRecurringTransactions(userId: string) {
  const supabase = createClient();
  const today = new Date().toISOString().slice(0, 10);

  // Find all active templates due for generation
  const { data: templates, error: fetchError } = await supabase
    .from("recurring_templates")
    .select("*")
    .eq("user_id", userId)
    .eq("is_active", true)
    .lte("next_date", today);

  if (fetchError) throw fetchError;
  if (!templates || templates.length === 0) return 0;

  let count = 0;

  for (const template of templates) {
    // Skip if past end_date
    if (template.end_date && template.next_date > template.end_date) {
      // Deactivate expired template
      await supabase
        .from("recurring_templates")
        .update({ is_active: false })
        .eq("id", template.id);
      continue;
    }

    // Create the transaction
    const { error: insertError } = await supabase
      .from("transactions")
      .insert({
        user_id: userId,
        category_id: template.category_id,
        name: template.name,
        amount: template.amount,
        type: template.type,
        payment_method: template.payment_method,
        date: template.next_date,
        notes: template.notes,
      });

    if (insertError) continue;
    count++;

    // Advance next_date
    const newNextDate = getNextOccurrence(template.next_date, template.frequency);
    await supabase
      .from("recurring_templates")
      .update({ next_date: newNextDate })
      .eq("id", template.id);
  }

  return count;
}
