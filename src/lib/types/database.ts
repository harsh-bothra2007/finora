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

export type PaymentMethod = "upi" | "cash" | "card" | "bank_transfer" | "other";

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

// Transaction joined with category for display
export const PAYMENT_METHODS: { value: PaymentMethod; label: string; icon: string }[] = [
  { value: "upi", label: "UPI", icon: "🏦" },
  { value: "cash", label: "Cash", icon: "💵" },
  { value: "card", label: "Card", icon: "💳" },
  { value: "bank_transfer", label: "Bank Transfer", icon: "🏛️" },
  { value: "other", label: "Other", icon: "📎" },
];

export interface TransactionWithCategory extends Transaction {
  categories: Pick<Category, "name" | "icon" | "color"> | null;
}

// Budget joined with category for display
export interface BudgetWithCategory extends Budget {
  categories: Pick<Category, "name" | "icon" | "color">;
}

// Dashboard summary
export interface DashboardSummary {
  totalBalance: number;
  totalIncome: number;
  totalExpenses: number;
  balanceChange: number; // percentage
}
