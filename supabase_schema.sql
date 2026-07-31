-- 1. Create Profiles Table
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  full_name text,
  monthly_income numeric not null default 0.00,
  is_irregular_income boolean not null default false,
  base_currency text not null default 'INR',
  has_completed_onboarding boolean not null default false,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Create Automatically Populate Profile Trigger Function
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, monthly_income, is_irregular_income, base_currency, has_completed_onboarding, full_name)
  values (new.id, 0.00, false, 'INR', false, coalesce(new.raw_user_meta_data->>'full_name', ''));
  return new;
end;
$$ language plpgsql security definer;

-- Trigger to execute the function on user signup
create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Insert profile rows for existing auth users if they were created before the trigger
insert into public.profiles (id)
select id from auth.users
on conflict (id) do nothing;

-- 3. Create Categories Table
create table public.categories (
  id uuid default gen_random_uuid() primary key,
  profile_id uuid references public.profiles(id) on delete cascade not null,
  name text not null,
  icon text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 4. Create Budgets Table
create table public.budgets (
  id uuid default gen_random_uuid() primary key,
  profile_id uuid references public.profiles(id) on delete cascade not null,
  category_id uuid references public.categories(id) on delete cascade not null,
  amount_limit numeric not null default 0.00,
  is_rollover_enabled boolean not null default true,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(profile_id, category_id)
);

-- 5. Create Transactions Table
create table public.transactions (
  id uuid default gen_random_uuid() primary key,
  profile_id uuid references public.profiles(id) on delete cascade not null,
  amount numeric not null,
  type text not null check (type in ('expense', 'income')),
  category_id uuid references public.categories(id) on delete cascade,
  note text,
  date date not null default current_date,
  is_recurring boolean not null default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 6. Create Savings Goals Table
create table public.savings_goals (
  id uuid default gen_random_uuid() primary key,
  profile_id uuid references public.profiles(id) on delete cascade not null,
  name text not null,
  target_amount numeric not null,
  current_amount numeric not null default 0.00,
  target_date date not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 7. Create Recurring Rules Table
create table public.recurring_rules (
  id uuid default gen_random_uuid() primary key,
  profile_id uuid references public.profiles(id) on delete cascade not null,
  amount numeric not null,
  type text not null check (type in ('expense', 'income')),
  frequency text not null check (frequency in ('weekly', 'biweekly', 'monthly')),
  next_due_date date not null,
  category_id uuid references public.categories(id) on delete cascade,
  note text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable Row Level Security (RLS) on all tables
alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.budgets enable row level security;
alter table public.transactions enable row level security;
alter table public.savings_goals enable row level security;
alter table public.recurring_rules enable row level security;

-- ========================================================
-- Row Level Security (RLS) Policies
-- ========================================================

-- Profiles Policies
create policy "Users can view own profile" on public.profiles
  for select using (auth.uid() = id);

create policy "Users can update own profile" on public.profiles
  for update using (auth.uid() = id);

-- Categories Policies
create policy "Users can view own categories" on public.categories
  for select using (auth.uid() = profile_id);

create policy "Users can insert own categories" on public.categories
  for insert with check (auth.uid() = profile_id);

create policy "Users can update own categories" on public.categories
  for update using (auth.uid() = profile_id);

create policy "Users can delete own categories" on public.categories
  for delete using (auth.uid() = profile_id);

-- Budgets Policies
create policy "Users can view own budgets" on public.budgets
  for select using (auth.uid() = profile_id);

create policy "Users can insert own budgets" on public.budgets
  for insert with check (auth.uid() = profile_id);

create policy "Users can update own budgets" on public.budgets
  for update using (auth.uid() = profile_id);

create policy "Users can delete own budgets" on public.budgets
  for delete using (auth.uid() = profile_id);

-- Transactions Policies
create policy "Users can view own transactions" on public.transactions
  for select using (auth.uid() = profile_id);

create policy "Users can insert own transactions" on public.transactions
  for insert with check (auth.uid() = profile_id);

create policy "Users can update own transactions" on public.transactions
  for update using (auth.uid() = profile_id);

create policy "Users can delete own transactions" on public.transactions
  for delete using (auth.uid() = profile_id);

-- Savings Goals Policies
create policy "Users can view own savings goals" on public.savings_goals
  for select using (auth.uid() = profile_id);

create policy "Users can insert own savings goals" on public.savings_goals
  for insert with check (auth.uid() = profile_id);

create policy "Users can update own savings goals" on public.savings_goals
  for update using (auth.uid() = profile_id);

create policy "Users can delete own savings goals" on public.savings_goals
  for delete using (auth.uid() = profile_id);

-- Recurring Rules Policies
create policy "Users can view own recurring rules" on public.recurring_rules
  for select using (auth.uid() = profile_id);

create policy "Users can insert own recurring rules" on public.recurring_rules
  for insert with check (auth.uid() = profile_id);

create policy "Users can update own recurring rules" on public.recurring_rules
  for update using (auth.uid() = profile_id);

create policy "Users can delete own recurring rules" on public.recurring_rules
  for delete using (auth.uid() = profile_id);

-- ========================================================
-- Performance Indexes
-- ========================================================
create index if not exists idx_transactions_profile_date on public.transactions(profile_id, date desc);
create index if not exists idx_transactions_profile_type_date on public.transactions(profile_id, type, date);
create index if not exists idx_recurring_rules_profile_due on public.recurring_rules(profile_id, next_due_date);
create index if not exists idx_budgets_profile_category on public.budgets(profile_id, category_id);
create index if not exists idx_categories_profile on public.categories(profile_id);

