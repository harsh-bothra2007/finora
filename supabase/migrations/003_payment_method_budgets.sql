-- ============================================================
-- Migration 003: Payment Method Budgets
-- ============================================================

-- 1. PAYMENT METHOD BUDGETS — spending limits per payment method
-- ============================================================
create table public.payment_method_budgets (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  payment_method  text not null,
  amount          numeric(12, 2) not null check (amount > 0),
  period          text not null default 'monthly' check (period in ('weekly', 'monthly', 'yearly')),
  start_date      date not null default current_date,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- One active budget per payment method per user
create unique index idx_pm_budgets_user_method
  on public.payment_method_budgets (user_id, payment_method);

-- 2. RLS for payment_method_budgets
-- ============================================================
alter table public.payment_method_budgets enable row level security;

create policy "Users can view own payment method budgets"
  on public.payment_method_budgets for select
  using (auth.uid() = user_id);

create policy "Users can insert own payment method budgets"
  on public.payment_method_budgets for insert
  with check (auth.uid() = user_id);

create policy "Users can update own payment method budgets"
  on public.payment_method_budgets for update
  using (auth.uid() = user_id);

create policy "Users can delete own payment method budgets"
  on public.payment_method_budgets for delete
  using (auth.uid() = user_id);

-- 3. UPDATED_AT trigger
-- ============================================================
create trigger set_updated_at_payment_method_budgets
  before update on public.payment_method_budgets
  for each row execute function public.update_updated_at();
