-- ============================================================
-- Finora — Initial Database Schema
-- Run this in the Supabase SQL Editor or via `supabase db push`
-- ============================================================

-- 1. PROFILES — extends auth.users with app-specific data
-- ============================================================
create table public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  name       text not null default '',
  role       text not null default 'student' check (role in ('student', 'employee', 'employer')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Auto-create a profile when a new user signs up
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'name', ''),
    coalesce(new.raw_user_meta_data ->> 'role', 'student')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();


-- 2. CATEGORIES — user-defined transaction categories
-- ============================================================
create table public.categories (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  name       text not null,
  icon       text not null default 'tag',
  color      text not null default '#64748b',
  type       text not null check (type in ('income', 'expense')),
  created_at timestamptz not null default now()
);

-- Unique category name per user per type
create unique index idx_categories_user_name_type
  on public.categories (user_id, name, type);


-- 3. TRANSACTIONS — income and expenses
-- ============================================================
create table public.transactions (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users(id) on delete cascade,
  category_id    uuid references public.categories(id) on delete set null,
  name           text not null,
  amount         numeric(12, 2) not null check (amount > 0),
  type           text not null check (type in ('income', 'expense')),
  payment_method text not null default 'other' check (payment_method in ('upi', 'cash', 'card', 'bank_transfer', 'other')),
  date           date not null default current_date,
  notes          text not null default '',
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index idx_transactions_user_date
  on public.transactions (user_id, date desc);

create index idx_transactions_user_type
  on public.transactions (user_id, type);


-- 4. BUDGETS — spending limits per category
-- ============================================================
create table public.budgets (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  category_id uuid not null references public.categories(id) on delete cascade,
  amount      numeric(12, 2) not null check (amount > 0),
  period      text not null default 'monthly' check (period in ('weekly', 'monthly', 'yearly')),
  start_date  date not null default current_date,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- One active budget per category per user
create unique index idx_budgets_user_category
  on public.budgets (user_id, category_id);


-- 5. SAVINGS GOALS — track savings targets
-- ============================================================
create table public.savings_goals (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users(id) on delete cascade,
  name           text not null,
  target_amount  numeric(12, 2) not null check (target_amount > 0),
  current_amount numeric(12, 2) not null default 0 check (current_amount >= 0),
  deadline       date,
  icon           text not null default 'piggy-bank',
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index idx_savings_goals_user
  on public.savings_goals (user_id);


-- 6. RECURRING TEMPLATES — recurring income/expense schedules
-- ============================================================
create table public.recurring_templates (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  category_id     uuid references public.categories(id) on delete set null,
  name            text not null,
  amount          numeric(12, 2) not null check (amount > 0),
  type            text not null check (type in ('income', 'expense')),
  payment_method  text not null default 'other' check (payment_method in ('upi', 'cash', 'card', 'bank_transfer', 'other')),
  frequency       text not null check (frequency in ('daily', 'weekly', 'monthly', 'yearly')),
  start_date      date not null default current_date,
  end_date        date,
  next_date       date not null default current_date,
  notes           text not null default '',
  is_active       boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index idx_recurring_templates_user
  on public.recurring_templates (user_id);

create index idx_recurring_templates_next_date
  on public.recurring_templates (next_date) where is_active = true;


-- ============================================================
-- UPDATED_AT TRIGGER — auto-update on row change
-- ============================================================
create or replace function public.update_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_updated_at_profiles
  before update on public.profiles
  for each row execute function public.update_updated_at();

create trigger set_updated_at_transactions
  before update on public.transactions
  for each row execute function public.update_updated_at();

create trigger set_updated_at_budgets
  before update on public.budgets
  for each row execute function public.update_updated_at();

create trigger set_updated_at_savings_goals
  before update on public.savings_goals
  for each row execute function public.update_updated_at();

create trigger set_updated_at_recurring_templates
  before update on public.recurring_templates
  for each row execute function public.update_updated_at();


-- ============================================================
-- ROW LEVEL SECURITY — users can only see their own data
-- ============================================================
alter table public.profiles              enable row level security;
alter table public.categories            enable row level security;
alter table public.transactions          enable row level security;
alter table public.budgets               enable row level security;
alter table public.savings_goals         enable row level security;
alter table public.recurring_templates   enable row level security;

-- Profiles: users can read/update their own
create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- Categories: full CRUD for own data
create policy "Users can view own categories"
  on public.categories for select
  using (auth.uid() = user_id);

create policy "Users can insert own categories"
  on public.categories for insert
  with check (auth.uid() = user_id);

create policy "Users can update own categories"
  on public.categories for update
  using (auth.uid() = user_id);

create policy "Users can delete own categories"
  on public.categories for delete
  using (auth.uid() = user_id);

-- Transactions: full CRUD for own data
create policy "Users can view own transactions"
  on public.transactions for select
  using (auth.uid() = user_id);

create policy "Users can insert own transactions"
  on public.transactions for insert
  with check (auth.uid() = user_id);

create policy "Users can update own transactions"
  on public.transactions for update
  using (auth.uid() = user_id);

create policy "Users can delete own transactions"
  on public.transactions for delete
  using (auth.uid() = user_id);

-- Budgets: full CRUD for own data
create policy "Users can view own budgets"
  on public.budgets for select
  using (auth.uid() = user_id);

create policy "Users can insert own budgets"
  on public.budgets for insert
  with check (auth.uid() = user_id);

create policy "Users can update own budgets"
  on public.budgets for update
  using (auth.uid() = user_id);

create policy "Users can delete own budgets"
  on public.budgets for delete
  using (auth.uid() = user_id);

-- Savings Goals: full CRUD for own data
create policy "Users can view own savings goals"
  on public.savings_goals for select
  using (auth.uid() = user_id);

create policy "Users can insert own savings goals"
  on public.savings_goals for insert
  with check (auth.uid() = user_id);

create policy "Users can update own savings goals"
  on public.savings_goals for update
  using (auth.uid() = user_id);

create policy "Users can delete own savings goals"
  on public.savings_goals for delete
  using (auth.uid() = user_id);

-- Recurring Templates: full CRUD for own data
create policy "Users can view own recurring templates"
  on public.recurring_templates for select
  using (auth.uid() = user_id);

create policy "Users can insert own recurring templates"
  on public.recurring_templates for insert
  with check (auth.uid() = user_id);

create policy "Users can update own recurring templates"
  on public.recurring_templates for update
  using (auth.uid() = user_id);

create policy "Users can delete own recurring templates"
  on public.recurring_templates for delete
  using (auth.uid() = user_id);
