-- Enable necessary extensions
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- ============================================================
-- FAMILIES
-- ============================================================
create table if not exists families (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  timezone text not null default 'Asia/Jerusalem',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================================
-- PROFILES
-- ============================================================
create table if not exists profiles (
  id uuid primary key default uuid_generate_v4(),
  auth_user_id uuid references auth.users(id) on delete cascade,
  family_id uuid references families(id) on delete cascade,
  display_name text not null,
  role text not null check (role in ('family_admin','parent','child')),
  child_id uuid nullable,  -- set after children table exists; FK added later
  phone text,
  avatar_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (auth_user_id)
);

-- ============================================================
-- CHILDREN
-- ============================================================
create table if not exists children (
  id uuid primary key default uuid_generate_v4(),
  family_id uuid references families(id) on delete cascade,
  name text not null,
  color text not null default '#6366f1',
  mashov_student_id text,
  active boolean default true,
  school_name text,
  school_code text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Now add FK from profiles.child_id -> children.id
alter table profiles
  add constraint profiles_child_id_fkey
  foreign key (child_id) references children(id) on delete set null;

-- ============================================================
-- INTEGRATIONS
-- ============================================================
create table if not exists integrations (
  id uuid primary key default uuid_generate_v4(),
  family_id uuid references families(id) on delete cascade,
  owner_profile_id uuid references profiles(id) on delete set null,
  provider text not null check (provider in ('google_calendar','mashov','whatsapp','web_push')),
  display_name text not null,
  status text not null default 'disabled' check (status in ('connected','error','disabled','needs_reauth')),
  encrypted_secret_ref text,
  metadata jsonb default '{}',
  last_sync_at timestamptz,
  last_error text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================================
-- EXTERNAL CALENDARS
-- ============================================================
create table if not exists external_calendars (
  id uuid primary key default uuid_generate_v4(),
  family_id uuid references families(id) on delete cascade,
  integration_id uuid references integrations(id) on delete cascade,
  provider_calendar_id text not null,
  name text not null,
  color text,
  selected boolean default true,
  writable boolean default false,
  default_for_new_events boolean default false,
  sync_token text,
  watch_channel_id text,
  watch_resource_id text,
  watch_expires_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (integration_id, provider_calendar_id)
);

-- ============================================================
-- CALENDAR ITEMS
-- ============================================================
create table if not exists calendar_items (
  id uuid primary key default uuid_generate_v4(),
  family_id uuid references families(id) on delete cascade,
  child_id uuid references children(id) on delete set null,
  source_provider text not null check (source_provider in ('local','google_calendar','mashov')),
  source_type text not null check (source_type in ('task','event','homework','lesson','exam','parent_approval')),
  source_integration_id uuid references integrations(id) on delete set null,
  source_calendar_id uuid references external_calendars(id) on delete set null,
  external_id text,
  dedupe_key text unique not null,
  title text not null,
  description text,
  location text,
  subject text,
  teacher text,
  starts_at timestamptz,
  ends_at timestamptz,
  due_at timestamptz,
  all_day boolean default false,
  status text not null default 'active' check (status in ('active','completed','cancelled','hidden','needs_action')),
  priority text,
  color text,
  visibility text not null default 'family' check (visibility in ('family','parents_only','child_only')),
  is_editable boolean default false,
  source_updated_at timestamptz,
  raw jsonb default '{}',
  created_by_profile_id uuid references profiles(id) on delete set null,
  updated_by_profile_id uuid references profiles(id) on delete set null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists calendar_items_family_id_idx on calendar_items(family_id);
create index if not exists calendar_items_child_id_idx on calendar_items(child_id);
create index if not exists calendar_items_source_provider_idx on calendar_items(source_provider);
create index if not exists calendar_items_source_type_idx on calendar_items(source_type);
create index if not exists calendar_items_starts_at_idx on calendar_items(starts_at);
create index if not exists calendar_items_due_at_idx on calendar_items(due_at);
create index if not exists calendar_items_status_idx on calendar_items(status);

-- ============================================================
-- CALENDAR ITEM OVERLAYS
-- ============================================================
create table if not exists calendar_item_overlays (
  id uuid primary key default uuid_generate_v4(),
  family_id uuid references families(id) on delete cascade,
  item_id uuid references calendar_items(id) on delete cascade,
  profile_id uuid references profiles(id) on delete cascade,
  child_id uuid references children(id) on delete set null,
  local_status text check (local_status in ('completed','hidden','snoozed','acknowledged')),
  notes text,
  local_color text,
  reminder_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (item_id, profile_id)
);

create index if not exists overlays_item_id_idx on calendar_item_overlays(item_id);
create index if not exists overlays_profile_id_idx on calendar_item_overlays(profile_id);

-- ============================================================
-- NOTIFICATION PREFERENCES
-- ============================================================
create table if not exists notification_preferences (
  id uuid primary key default uuid_generate_v4(),
  family_id uuid references families(id) on delete cascade,
  profile_id uuid references profiles(id) on delete cascade,
  channel text not null check (channel in ('push','whatsapp')),
  enabled boolean default true,
  homework_reminders boolean default true,
  lesson_reminders boolean default true,
  exam_reminders boolean default true,
  parent_approval_reminders boolean default true,
  daily_summary boolean default true,
  quiet_hours_start time,
  quiet_hours_end time,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (profile_id, channel)
);

-- ============================================================
-- PUSH SUBSCRIPTIONS
-- ============================================================
create table if not exists push_subscriptions (
  id uuid primary key default uuid_generate_v4(),
  family_id uuid references families(id) on delete cascade,
  profile_id uuid references profiles(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  device_name text,
  created_at timestamptz default now(),
  last_used_at timestamptz
);

-- ============================================================
-- SYNC JOBS
-- ============================================================
create table if not exists sync_jobs (
  id uuid primary key default uuid_generate_v4(),
  family_id uuid references families(id) on delete cascade,
  integration_id uuid references integrations(id) on delete set null,
  provider text not null,
  job_type text not null,
  status text not null default 'queued' check (status in ('queued','running','success','failed')),
  payload jsonb default '{}',
  started_at timestamptz,
  finished_at timestamptz,
  error text,
  created_at timestamptz default now()
);

create index if not exists sync_jobs_family_status_idx on sync_jobs(family_id, status);
create index if not exists sync_jobs_integration_idx on sync_jobs(integration_id);

-- ============================================================
-- SYNC LOGS
-- ============================================================
create table if not exists sync_logs (
  id uuid primary key default uuid_generate_v4(),
  family_id uuid references families(id) on delete cascade,
  integration_id uuid references integrations(id) on delete set null,
  level text not null check (level in ('info','warning','error')),
  message text not null,
  metadata jsonb default '{}',
  created_at timestamptz default now()
);

create index if not exists sync_logs_family_id_idx on sync_logs(family_id);
create index if not exists sync_logs_integration_id_idx on sync_logs(integration_id);
create index if not exists sync_logs_created_at_idx on sync_logs(created_at);

-- ============================================================
-- UPDATED_AT TRIGGER
-- ============================================================
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger update_families_updated_at before update on families
  for each row execute function update_updated_at_column();
create trigger update_profiles_updated_at before update on profiles
  for each row execute function update_updated_at_column();
create trigger update_children_updated_at before update on children
  for each row execute function update_updated_at_column();
create trigger update_integrations_updated_at before update on integrations
  for each row execute function update_updated_at_column();
create trigger update_external_calendars_updated_at before update on external_calendars
  for each row execute function update_updated_at_column();
create trigger update_calendar_items_updated_at before update on calendar_items
  for each row execute function update_updated_at_column();
create trigger update_overlays_updated_at before update on calendar_item_overlays
  for each row execute function update_updated_at_column();
create trigger update_notification_prefs_updated_at before update on notification_preferences
  for each row execute function update_updated_at_column();
