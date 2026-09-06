-- ============================================================
-- Migration 002: Payment Methods
-- ============================================================

-- 1. CUSTOM PAYMENT METHODS — user-defined payment methods
-- ============================================================
create table public.custom_payment_methods (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  name       text not null,
  icon       text not null default '💳',
  color      text not null default '#64748b',
  created_at timestamptz not null default now()
);

-- Unique custom payment method name per user
create unique index idx_custom_pm_user_name
  on public.custom_payment_methods (user_id, name);

-- 2. Relax CHECK constraints on payment_method to allow custom values
-- ============================================================

-- Drop existing CHECK constraints
-- We need to find and drop them by name (PostgreSQL auto-generates constraint names)
-- For transactions
do $$
begin
  -- Try to drop the constraint if it exists
  if exists (
    select 1 from pg_constraint
    where conname = 'transactions_payment_method_check'
    and conrelid = 'public.transactions'::regclass
  ) then
    alter table public.transactions drop constraint transactions_payment_method_check;
  end if;

  -- For recurring_templates
  if exists (
    select 1 from pg_constraint
    where conname = 'recurring_templates_payment_method_check'
    and conrelid = 'public.recurring_templates'::regclass
  ) then
    alter table public.recurring_templates drop constraint recurring_templates_payment_method_check;
  end if;
end $$;

-- 3. RLS for custom_payment_methods
-- ============================================================
alter table public.custom_payment_methods enable row level security;

create policy "Users can view own custom payment methods"
  on public.custom_payment_methods for select
  using (auth.uid() = user_id);

create policy "Users can insert own custom payment methods"
  on public.custom_payment_methods for insert
  with check (auth.uid() = user_id);

create policy "Users can update own custom payment methods"
  on public.custom_payment_methods for update
  using (auth.uid() = user_id);

create policy "Users can delete own custom payment methods"
  on public.custom_payment_methods for delete
  using (auth.uid() = user_id);
