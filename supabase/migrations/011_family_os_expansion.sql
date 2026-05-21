-- ============================================================
-- FAMILY OS EXPANSION MIGRATION
-- ============================================================

-- ============================================================
-- UPDATED_AT TRIGGER HELPER
-- ============================================================
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ============================================================
-- SHOPPING LISTS
-- ============================================================
create table if not exists shopping_lists (
  id uuid primary key default uuid_generate_v4(),
  family_id uuid not null references families(id) on delete cascade,
  name text not null,
  is_default boolean not null default false,
  created_by_profile_id uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_shopping_lists_family on shopping_lists(family_id);

create trigger shopping_lists_updated_at
  before update on shopping_lists
  for each row execute function set_updated_at();

-- ============================================================
-- SHOPPING ITEMS
-- ============================================================
create table if not exists shopping_items (
  id uuid primary key default uuid_generate_v4(),
  family_id uuid not null references families(id) on delete cascade,
  list_id uuid not null references shopping_lists(id) on delete cascade,
  title text not null,
  quantity text,
  category text,
  status text not null default 'active' check (status in ('active', 'completed', 'archived')),
  added_by_profile_id uuid references profiles(id) on delete set null,
  completed_by_profile_id uuid references profiles(id) on delete set null,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_shopping_items_family on shopping_items(family_id);
create index idx_shopping_items_list on shopping_items(list_id);
create index idx_shopping_items_status on shopping_items(status);

create trigger shopping_items_updated_at
  before update on shopping_items
  for each row execute function set_updated_at();

-- ============================================================
-- FAMILY INBOX ITEMS
-- ============================================================
create table if not exists family_inbox_items (
  id uuid primary key default uuid_generate_v4(),
  family_id uuid not null references families(id) on delete cascade,
  created_by_profile_id uuid references profiles(id) on delete set null,
  assigned_profile_id uuid references profiles(id) on delete set null,
  title text not null,
  body text,
  status text not null default 'inbox' check (status in ('inbox', 'triaged', 'archived', 'converted')),
  suggested_type text check (suggested_type in ('task', 'shopping_item', 'event', 'document', 'pet_event', 'maintenance_task', 'warranty_item')),
  source text not null default 'manual',
  raw_input text,
  converted_entity_type text,
  converted_entity_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_inbox_family on family_inbox_items(family_id);
create index idx_inbox_status on family_inbox_items(status);
create index idx_inbox_created on family_inbox_items(created_at desc);

create trigger family_inbox_updated_at
  before update on family_inbox_items
  for each row execute function set_updated_at();

-- ============================================================
-- DOCUMENTS
-- ============================================================
create table if not exists documents (
  id uuid primary key default uuid_generate_v4(),
  family_id uuid not null references families(id) on delete cascade,
  uploaded_by_profile_id uuid references profiles(id) on delete set null,
  title text not null,
  type text not null default 'other' check (type in ('receipt', 'warranty', 'insurance', 'contract', 'medical', 'school', 'pet', 'other')),
  storage_path text,
  file_name text,
  mime_type text,
  size_bytes bigint,
  visibility text not null default 'family' check (visibility in ('family', 'parents_only')),
  related_entity_type text,
  related_entity_id uuid,
  expires_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_documents_family on documents(family_id);
create index idx_documents_type on documents(type);
create index idx_documents_expires on documents(expires_at);
create index idx_documents_visibility on documents(visibility);

create trigger documents_updated_at
  before update on documents
  for each row execute function set_updated_at();

-- ============================================================
-- HOME ASSETS
-- ============================================================
create table if not exists home_assets (
  id uuid primary key default uuid_generate_v4(),
  family_id uuid not null references families(id) on delete cascade,
  created_by_profile_id uuid references profiles(id) on delete set null,
  name text not null,
  category text,
  brand text,
  model text,
  serial_number text,
  purchase_date date,
  purchase_store text,
  purchase_price numeric,
  warranty_until date,
  receipt_document_id uuid references documents(id) on delete set null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_home_assets_family on home_assets(family_id);
create index idx_home_assets_warranty on home_assets(warranty_until);

create trigger home_assets_updated_at
  before update on home_assets
  for each row execute function set_updated_at();

-- ============================================================
-- PETS
-- ============================================================
create table if not exists pets (
  id uuid primary key default uuid_generate_v4(),
  family_id uuid not null references families(id) on delete cascade,
  name text not null,
  type text not null default 'dog',
  breed text,
  birth_date date,
  avatar_url text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_pets_family on pets(family_id);

create trigger pets_updated_at
  before update on pets
  for each row execute function set_updated_at();

-- ============================================================
-- PET EVENTS
-- ============================================================
create table if not exists pet_events (
  id uuid primary key default uuid_generate_v4(),
  family_id uuid not null references families(id) on delete cascade,
  pet_id uuid not null references pets(id) on delete cascade,
  created_by_profile_id uuid references profiles(id) on delete set null,
  type text not null default 'other' check (type in ('vaccine', 'medication', 'vet_visit', 'grooming', 'weight', 'food', 'walk', 'other')),
  title text not null,
  event_date date,
  due_at timestamptz,
  repeat_rule text,
  status text not null default 'active' check (status in ('active', 'completed', 'cancelled')),
  document_id uuid references documents(id) on delete set null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_pet_events_family on pet_events(family_id);
create index idx_pet_events_pet on pet_events(pet_id);
create index idx_pet_events_due on pet_events(due_at);
create index idx_pet_events_status on pet_events(status);

create trigger pet_events_updated_at
  before update on pet_events
  for each row execute function set_updated_at();

-- ============================================================
-- HOME MAINTENANCE TASKS
-- ============================================================
create table if not exists home_maintenance_tasks (
  id uuid primary key default uuid_generate_v4(),
  family_id uuid not null references families(id) on delete cascade,
  created_by_profile_id uuid references profiles(id) on delete set null,
  title text not null,
  area text,
  category text,
  due_at timestamptz,
  repeat_rule text,
  status text not null default 'active' check (status in ('active', 'completed', 'skipped', 'cancelled')),
  assigned_profile_id uuid references profiles(id) on delete set null,
  last_completed_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_maintenance_family on home_maintenance_tasks(family_id);
create index idx_maintenance_due on home_maintenance_tasks(due_at);
create index idx_maintenance_status on home_maintenance_tasks(status);

create trigger maintenance_updated_at
  before update on home_maintenance_tasks
  for each row execute function set_updated_at();

-- ============================================================
-- FAMILY NOTIFICATIONS
-- ============================================================
create table if not exists family_notifications (
  id uuid primary key default uuid_generate_v4(),
  family_id uuid not null references families(id) on delete cascade,
  profile_id uuid not null references profiles(id) on delete cascade,
  title text not null,
  body text,
  type text,
  entity_type text,
  entity_id uuid,
  scheduled_at timestamptz,
  sent_at timestamptz,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index idx_family_notifs_profile on family_notifications(profile_id);
create index idx_family_notifs_family on family_notifications(family_id);
create index idx_family_notifs_read on family_notifications(read_at);
create index idx_family_notifs_created on family_notifications(created_at desc);

-- ============================================================
-- ACTIVITY LOG
-- ============================================================
create table if not exists activity_log (
  id uuid primary key default uuid_generate_v4(),
  family_id uuid not null references families(id) on delete cascade,
  actor_profile_id uuid references profiles(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create index idx_activity_family on activity_log(family_id);
create index idx_activity_created on activity_log(created_at desc);
create index idx_activity_entity on activity_log(entity_type, entity_id);

-- ============================================================
-- AUTOMATION RULES
-- ============================================================
create table if not exists automation_rules (
  id uuid primary key default uuid_generate_v4(),
  family_id uuid not null references families(id) on delete cascade,
  created_by_profile_id uuid references profiles(id) on delete set null,
  name text not null,
  description text,
  enabled boolean not null default true,
  trigger_type text not null,
  conditions jsonb not null default '{}',
  actions jsonb not null default '[]',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_rules_family on automation_rules(family_id);
create index idx_rules_enabled on automation_rules(enabled);

create trigger automation_rules_updated_at
  before update on automation_rules
  for each row execute function set_updated_at();

-- ============================================================
-- ASSISTANT MESSAGES
-- ============================================================
create table if not exists assistant_messages (
  id uuid primary key default uuid_generate_v4(),
  family_id uuid not null references families(id) on delete cascade,
  profile_id uuid references profiles(id) on delete set null,
  role text not null check (role in ('user', 'assistant', 'system')),
  content text not null,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create index idx_assistant_family on assistant_messages(family_id);
create index idx_assistant_profile on assistant_messages(profile_id);
create index idx_assistant_created on assistant_messages(created_at desc);

-- ============================================================
-- ENABLE RLS
-- ============================================================
alter table shopping_lists enable row level security;
alter table shopping_items enable row level security;
alter table family_inbox_items enable row level security;
alter table documents enable row level security;
alter table home_assets enable row level security;
alter table pets enable row level security;
alter table pet_events enable row level security;
alter table home_maintenance_tasks enable row level security;
alter table family_notifications enable row level security;
alter table activity_log enable row level security;
alter table automation_rules enable row level security;
alter table assistant_messages enable row level security;

-- ============================================================
-- RLS: SHOPPING LISTS
-- ============================================================
create policy "shopping_lists_select" on shopping_lists
  for select using (family_id = my_family_id());

create policy "shopping_lists_insert" on shopping_lists
  for insert with check (family_id = my_family_id());

create policy "shopping_lists_update" on shopping_lists
  for update using (family_id = my_family_id());

create policy "shopping_lists_delete" on shopping_lists
  for delete using (family_id = my_family_id() and is_parent_or_admin());

-- ============================================================
-- RLS: SHOPPING ITEMS
-- ============================================================
create policy "shopping_items_select" on shopping_items
  for select using (family_id = my_family_id());

create policy "shopping_items_insert" on shopping_items
  for insert with check (family_id = my_family_id());

create policy "shopping_items_update" on shopping_items
  for update using (family_id = my_family_id());

create policy "shopping_items_delete" on shopping_items
  for delete using (family_id = my_family_id());

-- ============================================================
-- RLS: FAMILY INBOX
-- ============================================================
create policy "inbox_select" on family_inbox_items
  for select using (family_id = my_family_id() and is_parent_or_admin());

create policy "inbox_insert" on family_inbox_items
  for insert with check (family_id = my_family_id() and is_parent_or_admin());

create policy "inbox_update" on family_inbox_items
  for update using (family_id = my_family_id() and is_parent_or_admin());

create policy "inbox_delete" on family_inbox_items
  for delete using (family_id = my_family_id() and is_parent_or_admin());

-- ============================================================
-- RLS: DOCUMENTS
-- ============================================================
create policy "documents_select" on documents
  for select using (
    family_id = my_family_id()
    and (
      visibility = 'family'
      or is_parent_or_admin()
    )
  );

create policy "documents_insert" on documents
  for insert with check (family_id = my_family_id() and is_parent_or_admin());

create policy "documents_update" on documents
  for update using (family_id = my_family_id() and is_parent_or_admin());

create policy "documents_delete" on documents
  for delete using (family_id = my_family_id() and is_parent_or_admin());

-- ============================================================
-- RLS: HOME ASSETS
-- ============================================================
create policy "assets_select" on home_assets
  for select using (family_id = my_family_id());

create policy "assets_insert" on home_assets
  for insert with check (family_id = my_family_id() and is_parent_or_admin());

create policy "assets_update" on home_assets
  for update using (family_id = my_family_id() and is_parent_or_admin());

create policy "assets_delete" on home_assets
  for delete using (family_id = my_family_id() and is_parent_or_admin());

-- ============================================================
-- RLS: PETS
-- ============================================================
create policy "pets_select" on pets
  for select using (family_id = my_family_id());

create policy "pets_insert" on pets
  for insert with check (family_id = my_family_id() and is_parent_or_admin());

create policy "pets_update" on pets
  for update using (family_id = my_family_id() and is_parent_or_admin());

create policy "pets_delete" on pets
  for delete using (family_id = my_family_id() and is_parent_or_admin());

-- ============================================================
-- RLS: PET EVENTS
-- ============================================================
create policy "pet_events_select" on pet_events
  for select using (family_id = my_family_id());

create policy "pet_events_insert" on pet_events
  for insert with check (family_id = my_family_id() and is_parent_or_admin());

create policy "pet_events_update" on pet_events
  for update using (family_id = my_family_id() and is_parent_or_admin());

create policy "pet_events_delete" on pet_events
  for delete using (family_id = my_family_id() and is_parent_or_admin());

-- ============================================================
-- RLS: HOME MAINTENANCE TASKS
-- ============================================================
create policy "maintenance_select" on home_maintenance_tasks
  for select using (family_id = my_family_id());

create policy "maintenance_insert" on home_maintenance_tasks
  for insert with check (family_id = my_family_id() and is_parent_or_admin());

create policy "maintenance_update" on home_maintenance_tasks
  for update using (family_id = my_family_id() and is_parent_or_admin());

create policy "maintenance_delete" on home_maintenance_tasks
  for delete using (family_id = my_family_id() and is_parent_or_admin());

-- ============================================================
-- RLS: FAMILY NOTIFICATIONS
-- ============================================================
create policy "family_notifs_select" on family_notifications
  for select using (
    family_id = my_family_id()
    and profile_id = (select id from profiles where auth_user_id = auth.uid() limit 1)
  );

create policy "family_notifs_insert" on family_notifications
  for insert with check (family_id = my_family_id());

create policy "family_notifs_update" on family_notifications
  for update using (
    family_id = my_family_id()
    and profile_id = (select id from profiles where auth_user_id = auth.uid() limit 1)
  );

create policy "family_notifs_delete" on family_notifications
  for delete using (
    family_id = my_family_id()
    and profile_id = (select id from profiles where auth_user_id = auth.uid() limit 1)
  );

-- ============================================================
-- RLS: ACTIVITY LOG
-- ============================================================
create policy "activity_select" on activity_log
  for select using (family_id = my_family_id() and is_parent_or_admin());

create policy "activity_insert" on activity_log
  for insert with check (family_id = my_family_id());

-- ============================================================
-- RLS: AUTOMATION RULES
-- ============================================================
create policy "rules_select" on automation_rules
  for select using (family_id = my_family_id() and is_parent_or_admin());

create policy "rules_insert" on automation_rules
  for insert with check (family_id = my_family_id() and is_parent_or_admin());

create policy "rules_update" on automation_rules
  for update using (family_id = my_family_id() and is_parent_or_admin());

create policy "rules_delete" on automation_rules
  for delete using (family_id = my_family_id() and is_parent_or_admin());

-- ============================================================
-- RLS: ASSISTANT MESSAGES
-- ============================================================
create policy "assistant_select" on assistant_messages
  for select using (
    family_id = my_family_id()
    and (
      profile_id = (select id from profiles where auth_user_id = auth.uid() limit 1)
      or is_parent_or_admin()
    )
  );

create policy "assistant_insert" on assistant_messages
  for insert with check (family_id = my_family_id());

-- ============================================================
-- REALTIME
-- ============================================================
begin;
  alter publication supabase_realtime add table shopping_items;
  alter publication supabase_realtime add table family_inbox_items;
  alter publication supabase_realtime add table family_notifications;
commit;
