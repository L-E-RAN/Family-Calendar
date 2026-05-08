-- ============================================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================================

-- Helper function: get profile for current user
create or replace function get_my_profile()
returns profiles
language sql
stable
security definer
as $$
  select * from profiles where auth_user_id = auth.uid() limit 1;
$$;

-- Helper function: get family_id for current user
create or replace function my_family_id()
returns uuid
language sql
stable
security definer
as $$
  select family_id from profiles where auth_user_id = auth.uid() limit 1;
$$;

-- Helper function: get role for current user
create or replace function my_role()
returns text
language sql
stable
security definer
as $$
  select role from profiles where auth_user_id = auth.uid() limit 1;
$$;

-- Helper function: get child_id for current user (if role=child)
create or replace function my_child_id()
returns uuid
language sql
stable
security definer
as $$
  select child_id from profiles where auth_user_id = auth.uid() limit 1;
$$;

-- Helper: check if current user is admin or parent
create or replace function is_parent_or_admin()
returns boolean
language sql
stable
security definer
as $$
  select role in ('family_admin','parent') from profiles where auth_user_id = auth.uid() limit 1;
$$;

-- ============================================================
-- Enable RLS
-- ============================================================
alter table families enable row level security;
alter table profiles enable row level security;
alter table children enable row level security;
alter table integrations enable row level security;
alter table external_calendars enable row level security;
alter table calendar_items enable row level security;
alter table calendar_item_overlays enable row level security;
alter table notification_preferences enable row level security;
alter table push_subscriptions enable row level security;
alter table sync_jobs enable row level security;
alter table sync_logs enable row level security;

-- ============================================================
-- FAMILIES POLICIES
-- ============================================================
create policy "families_select" on families
  for select using (id = my_family_id());

create policy "families_update" on families
  for update using (id = my_family_id() and my_role() = 'family_admin');

-- ============================================================
-- PROFILES POLICIES
-- ============================================================
create policy "profiles_select_family" on profiles
  for select using (family_id = my_family_id());

create policy "profiles_update_own" on profiles
  for update using (auth_user_id = auth.uid());

create policy "profiles_update_admin" on profiles
  for update using (family_id = my_family_id() and my_role() = 'family_admin');

create policy "profiles_insert_self" on profiles
  for insert with check (auth_user_id = auth.uid());

-- ============================================================
-- CHILDREN POLICIES
-- ============================================================
create policy "children_select" on children
  for select using (family_id = my_family_id());

create policy "children_insert" on children
  for insert with check (family_id = my_family_id() and my_role() in ('family_admin','parent'));

create policy "children_update" on children
  for update using (family_id = my_family_id() and my_role() in ('family_admin','parent'));

create policy "children_delete" on children
  for delete using (family_id = my_family_id() and my_role() = 'family_admin');

-- ============================================================
-- INTEGRATIONS POLICIES
-- ============================================================
-- Only admin/parent can see integrations (but not the secret)
create policy "integrations_select" on integrations
  for select using (family_id = my_family_id() and my_role() in ('family_admin','parent'));

create policy "integrations_insert" on integrations
  for insert with check (family_id = my_family_id() and my_role() = 'family_admin');

create policy "integrations_update" on integrations
  for update using (family_id = my_family_id() and my_role() = 'family_admin');

create policy "integrations_delete" on integrations
  for delete using (family_id = my_family_id() and my_role() = 'family_admin');

-- ============================================================
-- EXTERNAL CALENDARS POLICIES
-- ============================================================
create policy "ext_calendars_select" on external_calendars
  for select using (family_id = my_family_id() and my_role() in ('family_admin','parent'));

create policy "ext_calendars_insert" on external_calendars
  for insert with check (family_id = my_family_id() and my_role() = 'family_admin');

create policy "ext_calendars_update" on external_calendars
  for update using (family_id = my_family_id() and my_role() = 'family_admin');

create policy "ext_calendars_delete" on external_calendars
  for delete using (family_id = my_family_id() and my_role() = 'family_admin');

-- ============================================================
-- CALENDAR ITEMS POLICIES
-- ============================================================
-- Select: complex visibility rules
create policy "items_select" on calendar_items
  for select using (
    family_id = my_family_id()
    and (
      -- admin or parent can see everything except child_only items of other children
      (my_role() in ('family_admin','parent'))
      or
      -- child can see family-visible items
      (my_role() = 'child' and visibility = 'family' and (child_id is null or child_id = my_child_id()))
      or
      -- child can see their own child_only items
      (my_role() = 'child' and visibility = 'child_only' and child_id = my_child_id())
    )
    and visibility != 'parents_only' or my_role() in ('family_admin','parent')
  );

-- Insert: admin or parent
create policy "items_insert" on calendar_items
  for insert with check (
    family_id = my_family_id()
    and my_role() in ('family_admin','parent')
  );

-- Update: admin or parent, or child updating own assigned task status
create policy "items_update" on calendar_items
  for update using (
    family_id = my_family_id()
    and (
      my_role() in ('family_admin','parent')
      or (my_role() = 'child' and child_id = my_child_id() and source_provider = 'local')
    )
  );

-- Delete: admin or parent only
create policy "items_delete" on calendar_items
  for delete using (
    family_id = my_family_id()
    and my_role() in ('family_admin','parent')
  );

-- ============================================================
-- CALENDAR ITEM OVERLAYS POLICIES
-- ============================================================
create policy "overlays_select" on calendar_item_overlays
  for select using (
    family_id = my_family_id()
    and (
      my_role() in ('family_admin','parent')
      or profile_id = (select id from profiles where auth_user_id = auth.uid() limit 1)
    )
  );

create policy "overlays_insert" on calendar_item_overlays
  for insert with check (
    family_id = my_family_id()
    and profile_id = (select id from profiles where auth_user_id = auth.uid() limit 1)
  );

create policy "overlays_update" on calendar_item_overlays
  for update using (
    family_id = my_family_id()
    and profile_id = (select id from profiles where auth_user_id = auth.uid() limit 1)
  );

create policy "overlays_delete" on calendar_item_overlays
  for delete using (
    family_id = my_family_id()
    and profile_id = (select id from profiles where auth_user_id = auth.uid() limit 1)
  );

-- ============================================================
-- NOTIFICATION PREFERENCES POLICIES
-- ============================================================
create policy "notif_prefs_select" on notification_preferences
  for select using (
    family_id = my_family_id()
    and profile_id = (select id from profiles where auth_user_id = auth.uid() limit 1)
  );

create policy "notif_prefs_all" on notification_preferences
  for all using (
    family_id = my_family_id()
    and profile_id = (select id from profiles where auth_user_id = auth.uid() limit 1)
  );

-- ============================================================
-- PUSH SUBSCRIPTIONS POLICIES
-- ============================================================
create policy "push_subs_select" on push_subscriptions
  for select using (
    family_id = my_family_id()
    and profile_id = (select id from profiles where auth_user_id = auth.uid() limit 1)
  );

create policy "push_subs_insert" on push_subscriptions
  for insert with check (
    family_id = my_family_id()
    and profile_id = (select id from profiles where auth_user_id = auth.uid() limit 1)
  );

create policy "push_subs_delete" on push_subscriptions
  for delete using (
    family_id = my_family_id()
    and profile_id = (select id from profiles where auth_user_id = auth.uid() limit 1)
  );

-- ============================================================
-- SYNC JOBS POLICIES
-- ============================================================
create policy "sync_jobs_select" on sync_jobs
  for select using (
    family_id = my_family_id()
    and my_role() in ('family_admin','parent')
  );

-- ============================================================
-- SYNC LOGS POLICIES
-- ============================================================
create policy "sync_logs_select" on sync_logs
  for select using (
    family_id = my_family_id()
    and my_role() in ('family_admin','parent')
  );

-- ============================================================
-- REALTIME PUBLICATION
-- ============================================================
begin;
  -- Add tables to realtime
  alter publication supabase_realtime add table calendar_items;
  alter publication supabase_realtime add table calendar_item_overlays;
  alter publication supabase_realtime add table sync_jobs;
  alter publication supabase_realtime add table sync_logs;
commit;
