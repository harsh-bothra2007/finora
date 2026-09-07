// ============================================================
// Mock data for UI design only.
// Not connected to any backend. Replace with Supabase queries later.
// ============================================================

import type {
  Category,
  TransactionWithCategory,
  BudgetWithCategory,
  SavingsGoal,
  CustomPaymentMethod,
} from "@/lib/types/database";

export const MOCK_USER = {
  name: "Aarav Sharma",
  email: "aarav.sharma@finora.app",
};

export const mockCategories: Category[] = [
  { id: "c1", user_id: "u1", name: "Salary", icon: "💼", color: "#059669", type: "income", created_at: "", updated_at: "" },
  { id: "c2", user_id: "u1", name: "Freelance", icon: "💻", color: "#14b8a6", type: "income", created_at: "", updated_at: "" },
  { id: "c3", user_id: "u1", name: "Groceries", icon: "🛒", color: "#10b981", type: "expense", created_at: "", updated_at: "" },
  { id: "c4", user_id: "u1", name: "Rent", icon: "🏠", color: "#6366f1", type: "expense", created_at: "", updated_at: "" },
  { id: "c5", user_id: "u1", name: "Dining", icon: "🍽️", color: "#f59e0b", type: "expense", created_at: "", updated_at: "" },
  { id: "c6", user_id: "u1", name: "Transport", icon: "🚇", color: "#3b82f6", type: "expense", created_at: "", updated_at: "" },
  { id: "c7", user_id: "u1", name: "Entertainment", icon: "🎬", color: "#ec4899", type: "expense", created_at: "", updated_at: "" },
  { id: "c8", user_id: "u1", name: "Shopping", icon: "🛍️", color: "#8b5cf6", type: "expense", created_at: "", updated_at: "" },
  { id: "c9", user_id: "u1", name: "Utilities", icon: "💡", color: "#06b6d4", type: "expense", created_at: "", updated_at: "" },
  { id: "c10", user_id: "u1", name: "Healthcare", icon: "⚕️", color: "#ef4444", type: "expense", created_at: "", updated_at: "" },
];

const cat = (id: string) => mockCategories.find((c) => c.id === id)!;

export const mockTransactions: TransactionWithCategory[] = [
  { id: "t1", user_id: "u1", category_id: "c1", name: "Monthly Salary", amount: 85000, type: "income", payment_method: "bank_transfer", date: "2026-09-01", notes: "September payroll", created_at: "", updated_at: "", categories: cat("c1") },
  { id: "t2", user_id: "u1", category_id: "c4", name: "Apartment Rent", amount: 22000, type: "expense", payment_method: "bank_transfer", date: "2026-09-02", notes: "", created_at: "", updated_at: "", categories: cat("c4") },
  { id: "t3", user_id: "u1", category_id: "c3", name: "BigBasket Grocery", amount: 3450, type: "expense", payment_method: "upi", date: "2026-09-03", notes: "Weekly groceries", created_at: "", updated_at: "", categories: cat("c3") },
  { id: "t4", user_id: "u1", category_id: "c5", name: "Dinner with friends", amount: 1850, type: "expense", payment_method: "credit_card", date: "2026-09-03", notes: "Trattoria", created_at: "", updated_at: "", categories: cat("c5") },
  { id: "t5", user_id: "u1", category_id: "c6", name: "Metro Card Recharge", amount: 500, type: "expense", payment_method: "upi", date: "2026-09-04", notes: "", created_at: "", updated_at: "", categories: cat("c6") },
  { id: "t6", user_id: "u1", category_id: "c2", name: "Logo Design Project", amount: 12000, type: "income", payment_method: "bank_transfer", date: "2026-09-04", notes: "Client: Acme Co.", created_at: "", updated_at: "", categories: cat("c2") },
  { id: "t7", user_id: "u1", category_id: "c7", name: "Movie + Popcorn", amount: 620, type: "expense", payment_method: "debit_card", date: "2026-09-05", notes: "PVR Orion", created_at: "", updated_at: "", categories: cat("c7") },
  { id: "t8", user_id: "u1", category_id: "c8", name: "Cotton Shirt", amount: 1299, type: "expense", payment_method: "credit_card", date: "2026-09-05", notes: "", created_at: "", updated_at: "", categories: cat("c8") },
  { id: "t9", user_id: "u1", category_id: "c9", name: "Electricity Bill", amount: 2100, type: "expense", payment_method: "upi", date: "2026-09-05", notes: "August usage", created_at: "", updated_at: "", categories: cat("c9") },
  { id: "t10", user_id: "u1", category_id: "c3", name: "Local Kirana Store", amount: 840, type: "expense", payment_method: "cash", date: "2026-09-06", notes: "", created_at: "", updated_at: "", categories: cat("c3") },
  { id: "t11", user_id: "u1", category_id: "c10", name: "Pharmacy", amount: 450, type: "expense", payment_method: "upi", date: "2026-09-06", notes: "Vitamins", created_at: "", updated_at: "", categories: cat("c10") },
  { id: "t12", user_id: "u1", category_id: "c5", name: "Cafe Latte", amount: 320, type: "expense", payment_method: "wallet", date: "2026-09-06", notes: "", created_at: "", updated_at: "", categories: cat("c5") },
  { id: "t13", user_id: "u1", category_id: "c6", name: "Uber Ride", amount: 240, type: "expense", payment_method: "wallet", date: "2026-08-30", notes: "Airport drop", created_at: "", updated_at: "", categories: cat("c6") },
  { id: "t14", user_id: "u1", category_id: "c3", name: "Weekly Groceries", amount: 2980, type: "expense", payment_method: "upi", date: "2026-08-29", notes: "", created_at: "", updated_at: "", categories: cat("c3") },
  { id: "t15", user_id: "u1", category_id: "c7", name: "Spotify Premium", amount: 119, type: "expense", payment_method: "credit_card", date: "2026-08-28", notes: "Monthly subscription", created_at: "", updated_at: "", categories: cat("c7") },
  { id: "t16", user_id: "u1", category_id: "c8", name: "Running Shoes", amount: 4999, type: "expense", payment_method: "credit_card", date: "2026-08-27", notes: "Nike Pegasus", created_at: "", updated_at: "", categories: cat("c8") },
  { id: "t17", user_id: "u1", category_id: "c1", name: "Monthly Salary", amount: 85000, type: "income", payment_method: "bank_transfer", date: "2026-08-01", notes: "August payroll", created_at: "", updated_at: "", categories: cat("c1") },
  { id: "t18", user_id: "u1", category_id: "c4", name: "Apartment Rent", amount: 22000, type: "expense", payment_method: "bank_transfer", date: "2026-08-02", notes: "", created_at: "", updated_at: "", categories: cat("c4") },
  { id: "t19", user_id: "u1", category_id: "c5", name: "Birthday Dinner", amount: 3200, type: "expense", payment_method: "credit_card", date: "2026-08-15", notes: "Taj", created_at: "", updated_at: "", categories: cat("c5") },
  { id: "t20", user_id: "u1", category_id: "c9", name: "Broadband Bill", amount: 999, type: "expense", payment_method: "upi", date: "2026-08-20", notes: "ACT Fibernet", created_at: "", updated_at: "", categories: cat("c9") },
  { id: "t21", user_id: "u1", category_id: "c2", name: "Consulting Fee", amount: 18000, type: "income", payment_method: "bank_transfer", date: "2026-08-18", notes: "Tech audit", created_at: "", updated_at: "", categories: cat("c2") },
  { id: "t22", user_id: "u1", category_id: "c10", name: "Dental Checkup", amount: 1500, type: "expense", payment_method: "debit_card", date: "2026-08-22", notes: "", created_at: "", updated_at: "", categories: cat("c10") },
];

export const mockCustomPaymentMethods: CustomPaymentMethod[] = [];

export const mockBudgets: BudgetWithCategory[] = [
  { id: "b1", user_id: "u1", category_id: "c3", amount: 15000, period: "monthly", start_date: "2026-09-01", created_at: "", updated_at: "", categories: cat("c3") },
  { id: "b2", user_id: "u1", category_id: "c4", amount: 22000, period: "monthly", start_date: "2026-09-01", created_at: "", updated_at: "", categories: cat("c4") },
  { id: "b3", user_id: "u1", category_id: "c5", amount: 6000, period: "monthly", start_date: "2026-09-01", created_at: "", updated_at: "", categories: cat("c5") },
  { id: "b4", user_id: "u1", category_id: "c6", amount: 4000, period: "monthly", start_date: "2026-09-01", created_at: "", updated_at: "", categories: cat("c6") },
  { id: "b5", user_id: "u1", category_id: "c7", amount: 3000, period: "monthly", start_date: "2026-09-01", created_at: "", updated_at: "", categories: cat("c7") },
  { id: "b6", user_id: "u1", category_id: "c8", amount: 8000, period: "monthly", start_date: "2026-09-01", created_at: "", updated_at: "", categories: cat("c8") },
];

// Spent amounts per category for the current period (mock)
export const mockBudgetSpent: Record<string, number> = {
  c3: 4290, // Groceries — 29% healthy
  c4: 22000, // Rent — 100% at limit
  c5: 2170, // Dining — 36% healthy
  c6: 740, // Transport — 19% healthy
  c7: 620, // Entertainment — 21% healthy
  c8: 6298, // Shopping — 79% warning
};

export const mockSavingsGoals: SavingsGoal[] = [
  { id: "g1", user_id: "u1", name: "Emergency Fund", target_amount: 100000, current_amount: 75000, deadline: "2026-12-31", icon: "🛟", created_at: "", updated_at: "" },
  { id: "g2", user_id: "u1", name: "New Laptop", target_amount: 80000, current_amount: 52000, deadline: "2026-11-15", icon: "💻", created_at: "", updated_at: "" },
  { id: "g3", user_id: "u1", name: "Goa Vacation", target_amount: 60000, current_amount: 48000, deadline: "2026-10-01", icon: "🏖️", created_at: "", updated_at: "" },
  { id: "g4", user_id: "u1", name: "New Bike", target_amount: 120000, current_amount: 120000, deadline: null, icon: "🏍️", created_at: "", updated_at: "" },
  { id: "g5", user_id: "u1", name: "Home Down Payment", target_amount: 500000, current_amount: 90000, deadline: "2027-06-30", icon: "🏠", created_at: "", updated_at: "" },
];

export function inr(n: number): string {
  return `₹${Math.round(n).toLocaleString("en-IN")}`;
}

export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
