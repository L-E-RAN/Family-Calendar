-- ============================================================
-- REWARDS & DAILY BOARD
-- ============================================================

-- Add reward columns to calendar_items (additive only)
alter table calendar_items
  add column if not exists points_value integer not null default 0,
  add column if not exists penalty_points integer not null default 0,
  add column if not exists deadline_time time null,
  add column if not exists requires_parent_approval boolean not null default false,
  add column if not exists reward_enabled boolean not null default false;

-- ============================================================
-- DAILY ITEM COMPLETIONS
-- ============================================================
create table if not exists daily_item_completions (
  id uuid primary key default uuid_generate_v4(),
  family_id uuid references families(id) on delete cascade,
  item_id uuid references calendar_items(id) on delete cascade,
  profile_id uuid references profiles(id) on delete cascade,
  child_id uuid references children(id) on delete set null,
  completion_date date not null,
  status text not null default 'pending' check (status in (
    'pending','completed','completed_pending_approval',
    'late','missed','approved','rejected'
  )),
  completed_at timestamptz null,
  completed_by_profile_id uuid references profiles(id) on delete set null,
  points_awarded integer not null default 0,
  penalty_applied integer not null default 0,
  parent_approved_at timestamptz null,
  parent_approved_by_profile_id uuid references profiles(id) on delete set null,
  notes text null,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (item_id, profile_id, completion_date)
);

create index if not exists daily_completions_family_date_idx
  on daily_item_completions(family_id, completion_date);
create index if not exists daily_completions_item_idx
  on daily_item_completions(item_id);
create index if not exists daily_completions_profile_idx
  on daily_item_completions(profile_id);
create index if not exists daily_completions_child_idx
  on daily_item_completions(child_id);

create trigger update_daily_item_completions_updated_at
  before update on daily_item_completions
  for each row execute function update_updated_at_column();

-- ============================================================
-- SCREEN TIME REWARD TIERS
-- ============================================================
create table if not exists screen_time_reward_tiers (
  id uuid primary key default uuid_generate_v4(),
  family_id uuid references families(id) on delete cascade,
  child_id uuid references children(id) on delete cascade,
  min_points integer not null,
  screen_time_minutes integer not null,
  label text null,
  active boolean not null default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists screen_tiers_family_child_points_idx
  on screen_time_reward_tiers(family_id, child_id, min_points);

create trigger update_screen_time_reward_tiers_updated_at
  before update on screen_time_reward_tiers
  for each row execute function update_updated_at_column();

-- ============================================================
-- RLS
-- ============================================================
alter table daily_item_completions enable row level security;
alter table screen_time_reward_tiers enable row level security;

-- daily_item_completions: parents see all in family
create policy "completions_select_parent" on daily_item_completions
  for select using (
    family_id = my_family_id()
    and is_parent_or_admin()
  );

-- daily_item_completions: child sees own completions
create policy "completions_select_child" on daily_item_completions
  for select using (
    family_id = my_family_id()
    and my_role() = 'child'
    and (
      profile_id = (select id from profiles where auth_user_id = auth.uid() limit 1)
      or child_id = my_child_id()
    )
  );

-- daily_item_completions: parents can insert/update any completion in family
create policy "completions_insert_parent" on daily_item_completions
  for insert with check (
    family_id = my_family_id()
    and is_parent_or_admin()
  );

create policy "completions_update_parent" on daily_item_completions
  for update using (
    family_id = my_family_id()
    and is_parent_or_admin()
  );

-- daily_item_completions: child can insert/update only their own items
create policy "completions_insert_child" on daily_item_completions
  for insert with check (
    family_id = my_family_id()
    and my_role() = 'child'
    and profile_id = (select id from profiles where auth_user_id = auth.uid() limit 1)
    and child_id = my_child_id()
    -- child cannot self-approve
    and status not in ('approved','rejected')
  );

create policy "completions_update_child" on daily_item_completions
  for update using (
    family_id = my_family_id()
    and my_role() = 'child'
    and profile_id = (select id from profiles where auth_user_id = auth.uid() limit 1)
    and child_id = my_child_id()
  );

-- screen_time_reward_tiers: parents manage, children view own
create policy "screen_tiers_select_parent" on screen_time_reward_tiers
  for select using (
    family_id = my_family_id()
    and is_parent_or_admin()
  );

create policy "screen_tiers_select_child" on screen_time_reward_tiers
  for select using (
    family_id = my_family_id()
    and my_role() = 'child'
    and child_id = my_child_id()
    and active = true
  );

create policy "screen_tiers_insert" on screen_time_reward_tiers
  for insert with check (
    family_id = my_family_id()
    and is_parent_or_admin()
  );

create policy "screen_tiers_update" on screen_time_reward_tiers
  for update using (
    family_id = my_family_id()
    and is_parent_or_admin()
  );

create policy "screen_tiers_delete" on screen_time_reward_tiers
  for delete using (
    family_id = my_family_id()
    and is_parent_or_admin()
  );

-- Realtime for completions (children and parents both watch)
begin;
  alter publication supabase_realtime add table daily_item_completions;
commit;
