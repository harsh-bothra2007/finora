// ============================================================
// Database types — auto-generate with `npx supabase gen types typescript`
// This manual version stays in sync with the migration.
// ============================================================

export interface Profile {
  id: string;
  name: string;
  role: "student" | "employee" | "employer";
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: string;
  user_id: string;
  name: string;
  icon: string;
  color: string;
  type: "income" | "expense";
  created_at: string;
}

export type PaymentMethod = "upi" | "cash" | "credit_card" | "debit_card" | "bank_transfer" | "wallet" | "other" | `custom:${string}`;

export interface Transaction {
  id: string;
  user_id: string;
  category_id: string | null;
  name: string;
  amount: number;
  type: "income" | "expense";
  payment_method: PaymentMethod;
  date: string;
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface Budget {
  id: string;
  user_id: string;
  category_id: string;
  amount: number;
  period: "weekly" | "monthly" | "yearly";
  start_date: string;
  created_at: string;
  updated_at: string;
}

export interface SavingsGoal {
  id: string;
  user_id: string;
  name: string;
  target_amount: number;
  current_amount: number;
  deadline: string | null;
  icon: string;
  created_at: string;
  updated_at: string;
}

export type RecurringFrequency = "daily" | "weekly" | "monthly" | "yearly";

export interface RecurringTemplate {
  id: string;
  user_id: string;
  category_id: string | null;
  name: string;
  amount: number;
  type: "income" | "expense";
  payment_method: PaymentMethod;
  frequency: RecurringFrequency;
  start_date: string;
  end_date: string | null;
  next_date: string;
  notes: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface RecurringTemplateWithCategory extends RecurringTemplate {
  categories: Pick<Category, "name" | "icon" | "color"> | null;
}

// Transaction joined with category for display
export const PAYMENT_METHODS: { value: PaymentMethod; label: string; icon: string }[] = [
  { value: "upi", label: "UPI", icon: "🏦" },
  { value: "cash", label: "Cash", icon: "💵" },
  { value: "credit_card", label: "Credit Card", icon: "💳" },
  { value: "debit_card", label: "Debit Card", icon: "🏧" },
  { value: "bank_transfer", label: "Bank Transfer", icon: "🏛️" },
  { value: "wallet", label: "Wallet", icon: "👛" },
  { value: "other", label: "Other", icon: "📎" },
];

export interface CustomPaymentMethod {
  id: string;
  user_id: string;
  name: string;
  icon: string;
  color: string;
  created_at: string;
}

export interface PaymentMethodInfo {
  value: PaymentMethod;
  label: string;
  icon: string;
  color?: string;
  isCustom?: boolean;
}

/**
 * Resolve display info for any payment method value (built-in or custom).
 */
export function resolvePaymentMethod(
  value: PaymentMethod,
  customMethods: CustomPaymentMethod[] = []
): PaymentMethodInfo {
  if (value.startsWith("custom:")) {
    const customId = value.slice(7);
    const custom = customMethods.find((m) => m.id === customId);
    if (custom) {
      return {
        value,
        label: custom.name,
        icon: custom.icon,
        color: custom.color,
        isCustom: true,
      };
    }
  }
  const builtIn = PAYMENT_METHODS.find((m) => m.value === value);
  if (builtIn) return { ...builtIn };
  return { value, label: value, icon: "📎" };
}

export interface TransactionWithCategory extends Transaction {
  categories: Pick<Category, "name" | "icon" | "color"> | null;
}

// Budget joined with category for display
export interface BudgetWithCategory extends Budget {
  categories: Pick<Category, "name" | "icon" | "color">;
}

// ============================================================
// PAYMENT METHOD BUDGETS
// ============================================================

export interface PaymentMethodBudget {
  id: string;
  user_id: string;
  payment_method: string;
  amount: number;
  period: "weekly" | "monthly" | "yearly";
  start_date: string;
  created_at: string;
  updated_at: string;
}

// Dashboard summary
export interface DashboardSummary {
  totalBalance: number;
  totalIncome: number;
  totalExpenses: number;
  balanceChange: number; // percentage
}
