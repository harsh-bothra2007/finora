-- ============================================================
-- Default categories for new users
-- These are inserted by the handle_new_user trigger via a helper
-- or can be run manually after migration.
-- ============================================================

-- We'll use a function that the app can call after signup
-- to seed default categories for a new user.
create or replace function public.seed_default_categories(p_user_id uuid)
returns void
language plpgsql
security definer set search_path = ''
as $$
begin
  -- Income categories
  insert into public.categories (user_id, name, icon, color, type) values
    (p_user_id, 'Salary',      'briefcase',  '#10b981', 'income'),
    (p_user_id, 'Freelance',   'laptop',     '#06b6d4', 'income'),
    (p_user_id, 'Investments', 'trending-up','#8b5cf6', 'income'),
    (p_user_id, 'Other Income','plus-circle', '#64748b', 'income');

  -- Expense categories
  insert into public.categories (user_id, name, icon, color, type) values
    (p_user_id, 'Food & Dining',  'utensils',      '#f97316', 'expense'),
    (p_user_id, 'Transport',      'car',           '#3b82f6', 'expense'),
    (p_user_id, 'Shopping',       'shopping-bag',  '#ec4899', 'expense'),
    (p_user_id, 'Bills & Utilities','zap',         '#eab308', 'expense'),
    (p_user_id, 'Entertainment',  'film',          '#a855f7', 'expense'),
    (p_user_id, 'Health',         'heart',         '#ef4444', 'expense'),
    (p_user_id, 'Education',      'book-open',     '#14b8a6', 'expense'),
    (p_user_id, 'Subscriptions',  'refresh-cw',    '#6366f1', 'expense'),
    (p_user_id, 'Other Expense',  'tag',           '#64748b', 'expense');
end;
$$;
