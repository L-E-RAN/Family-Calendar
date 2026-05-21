export type UserRole = 'family_admin' | 'parent' | 'child'
export type IntegrationProvider = 'google_calendar' | 'mashov' | 'whatsapp' | 'web_push'
export type IntegrationStatus = 'connected' | 'error' | 'disabled' | 'needs_reauth'
export type SourceProvider = 'local' | 'google_calendar' | 'mashov'
export type SourceType = 'task' | 'event' | 'homework' | 'lesson' | 'exam' | 'parent_approval'
export type ItemStatus = 'active' | 'completed' | 'cancelled' | 'hidden' | 'needs_action'
export type ItemVisibility = 'family' | 'parents_only' | 'child_only'
export type LocalStatus = 'completed' | 'hidden' | 'snoozed' | 'acknowledged'
export type SyncJobStatus = 'queued' | 'running' | 'success' | 'failed'
export type LogLevel = 'info' | 'warning' | 'error'
export type NotificationChannel = 'push' | 'whatsapp'

export interface Family {
  id: string
  name: string
  timezone: string
  created_at: string
  updated_at: string
}

export interface Profile {
  id: string
  auth_user_id: string
  family_id: string
  display_name: string
  role: UserRole
  child_id: string | null
  phone: string | null
  avatar_url: string | null
  tablet_only: boolean
  created_at: string
  updated_at: string
}

export interface Child {
  id: string
  family_id: string
  name: string
  color: string
  mashov_student_id: string | null
  active: boolean
  school_name: string | null
  school_code: string | null
  created_at: string
  updated_at: string
}

export interface Integration {
  id: string
  family_id: string
  owner_profile_id: string
  provider: IntegrationProvider
  display_name: string
  status: IntegrationStatus
  encrypted_secret_ref: string | null
  metadata: Record<string, unknown>
  last_sync_at: string | null
  last_error: string | null
  created_at: string
  updated_at: string
}

export interface ExternalCalendar {
  id: string
  family_id: string
  integration_id: string
  provider_calendar_id: string
  name: string
  color: string | null
  selected: boolean
  writable: boolean
  default_for_new_events: boolean
  sync_token: string | null
  watch_channel_id: string | null
  watch_resource_id: string | null
  watch_expires_at: string | null
  created_at: string
  updated_at: string
}

export interface CalendarItem {
  id: string
  family_id: string
  child_id: string | null
  source_provider: SourceProvider
  source_type: SourceType
  source_integration_id: string | null
  source_calendar_id: string | null
  external_id: string | null
  dedupe_key: string
  title: string
  description: string | null
  location: string | null
  subject: string | null
  teacher: string | null
  starts_at: string | null
  ends_at: string | null
  due_at: string | null
  all_day: boolean
  status: ItemStatus
  priority: string | null
  color: string | null
  visibility: ItemVisibility
  is_editable: boolean
  source_updated_at: string | null
  raw: Record<string, unknown>
  created_by_profile_id: string | null
  updated_by_profile_id: string | null
  created_at: string
  updated_at: string
  // reward fields
  points_value: number
  penalty_points: number
  deadline_time: string | null
  requires_parent_approval: boolean
  reward_enabled: boolean
  is_recurring: boolean
  // joined
  child?: Child
  overlay?: CalendarItemOverlay
}

export type CompletionStatus =
  | 'pending'
  | 'completed'
  | 'completed_pending_approval'
  | 'late'
  | 'missed'
  | 'approved'
  | 'rejected'

export interface DailyItemCompletion {
  id: string
  family_id: string
  item_id: string
  profile_id: string
  child_id: string | null
  completion_date: string
  status: CompletionStatus
  completed_at: string | null
  completed_by_profile_id: string | null
  points_awarded: number
  penalty_applied: number
  parent_approved_at: string | null
  parent_approved_by_profile_id: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface ScreenTimeRewardTier {
  id: string
  family_id: string
  child_id: string | null
  min_points: number
  screen_time_minutes: number
  label: string | null
  active: boolean
  created_at: string
  updated_at: string
}

export interface TodayBoardItem {
  item: CalendarItem
  completion: DailyItemCompletion | null
  canComplete: boolean
  canApprove: boolean
}

export type BoardMemberType = 'parent' | 'child' | 'placeholder'

export interface TodayBoardMember {
  type: BoardMemberType
  profile: Profile | null
  child: Child | null
  items: TodayBoardItem[]
  totalScore: number
  earnedScreenMinutes: number
  nextTierMinutes: number | null
  nextTierPointsNeeded: number | null
  nextTierLabel: string | null
}

export interface TodayBoard {
  date: string
  columns: TodayBoardMember[]
  currentProfile: Profile
}

export interface CalendarItemOverlay {
  id: string
  family_id: string
  item_id: string
  profile_id: string
  child_id: string | null
  local_status: LocalStatus | null
  notes: string | null
  local_color: string | null
  reminder_at: string | null
  created_at: string
  updated_at: string
}

export interface NotificationPreferences {
  id: string
  family_id: string
  profile_id: string
  channel: NotificationChannel
  enabled: boolean
  homework_reminders: boolean
  lesson_reminders: boolean
  exam_reminders: boolean
  parent_approval_reminders: boolean
  daily_summary: boolean
  quiet_hours_start: string | null
  quiet_hours_end: string | null
  created_at: string
  updated_at: string
}

export interface PushSubscription {
  id: string
  family_id: string
  profile_id: string
  endpoint: string
  p256dh: string
  auth: string
  user_agent: string | null
  device_name: string | null
  created_at: string
  last_used_at: string | null
}

export interface SyncJob {
  id: string
  family_id: string
  integration_id: string | null
  provider: string
  job_type: string
  status: SyncJobStatus
  payload: Record<string, unknown>
  started_at: string | null
  finished_at: string | null
  error: string | null
  created_at: string
}

export interface SyncLog {
  id: string
  family_id: string
  integration_id: string | null
  level: LogLevel
  message: string
  metadata: Record<string, unknown>
  created_at: string
}

// ============================================================
// FAMILY OS — NEW TYPES
// ============================================================

export type ShoppingItemStatus = 'active' | 'completed' | 'archived'
export type InboxItemStatus = 'inbox' | 'triaged' | 'archived' | 'converted'
export type InboxSuggestedType = 'task' | 'shopping_item' | 'event' | 'document' | 'pet_event' | 'maintenance_task' | 'warranty_item'
export type DocumentType = 'receipt' | 'warranty' | 'insurance' | 'contract' | 'medical' | 'school' | 'pet' | 'other'
export type DocumentVisibility = 'family' | 'parents_only'
export type PetEventType = 'vaccine' | 'medication' | 'vet_visit' | 'grooming' | 'weight' | 'food' | 'walk' | 'other'
export type PetEventStatus = 'active' | 'completed' | 'cancelled'
export type MaintenanceStatus = 'active' | 'completed' | 'skipped' | 'cancelled'
export type AssistantRole = 'user' | 'assistant' | 'system'

export interface ShoppingList {
  id: string
  family_id: string
  name: string
  is_default: boolean
  created_by_profile_id: string | null
  created_at: string
  updated_at: string
}

export interface ShoppingItem {
  id: string
  family_id: string
  list_id: string
  title: string
  quantity: string | null
  category: string | null
  status: ShoppingItemStatus
  added_by_profile_id: string | null
  completed_by_profile_id: string | null
  completed_at: string | null
  created_at: string
  updated_at: string
  // joined
  added_by?: Profile
  completed_by?: Profile
}

export interface FamilyInboxItem {
  id: string
  family_id: string
  created_by_profile_id: string | null
  assigned_profile_id: string | null
  title: string
  body: string | null
  status: InboxItemStatus
  suggested_type: InboxSuggestedType | null
  source: string
  raw_input: string | null
  converted_entity_type: string | null
  converted_entity_id: string | null
  created_at: string
  updated_at: string
}

export interface Document {
  id: string
  family_id: string
  uploaded_by_profile_id: string | null
  title: string
  type: DocumentType
  storage_path: string | null
  file_name: string | null
  mime_type: string | null
  size_bytes: number | null
  visibility: DocumentVisibility
  related_entity_type: string | null
  related_entity_id: string | null
  expires_at: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface HomeAsset {
  id: string
  family_id: string
  created_by_profile_id: string | null
  name: string
  category: string | null
  brand: string | null
  model: string | null
  serial_number: string | null
  purchase_date: string | null
  purchase_store: string | null
  purchase_price: number | null
  warranty_until: string | null
  receipt_document_id: string | null
  notes: string | null
  created_at: string
  updated_at: string
  // joined
  receipt_document?: Document
}

export interface Pet {
  id: string
  family_id: string
  name: string
  type: string
  breed: string | null
  birth_date: string | null
  avatar_url: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface PetEvent {
  id: string
  family_id: string
  pet_id: string
  created_by_profile_id: string | null
  type: PetEventType
  title: string
  event_date: string | null
  due_at: string | null
  repeat_rule: string | null
  status: PetEventStatus
  document_id: string | null
  notes: string | null
  created_at: string
  updated_at: string
  // joined
  pet?: Pet
}

export interface HomeMaintenanceTask {
  id: string
  family_id: string
  created_by_profile_id: string | null
  title: string
  area: string | null
  category: string | null
  due_at: string | null
  repeat_rule: string | null
  status: MaintenanceStatus
  assigned_profile_id: string | null
  last_completed_at: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface FamilyNotification {
  id: string
  family_id: string
  profile_id: string
  title: string
  body: string | null
  type: string | null
  entity_type: string | null
  entity_id: string | null
  scheduled_at: string | null
  sent_at: string | null
  read_at: string | null
  created_at: string
}

export interface ActivityLogEntry {
  id: string
  family_id: string
  actor_profile_id: string | null
  action: string
  entity_type: string
  entity_id: string | null
  metadata: Record<string, unknown>
  created_at: string
  // joined
  actor?: Profile
}

export interface AutomationRule {
  id: string
  family_id: string
  created_by_profile_id: string | null
  name: string
  description: string | null
  enabled: boolean
  trigger_type: string
  conditions: Record<string, unknown>
  actions: unknown[]
  created_at: string
  updated_at: string
}

export interface AssistantMessage {
  id: string
  family_id: string
  profile_id: string | null
  role: AssistantRole
  content: string
  metadata: Record<string, unknown>
  created_at: string
}

export interface AssistantSuggestedAction {
  type: 'create_shopping_item' | 'create_task' | 'create_pet_event' | 'create_maintenance_task' | 'create_inbox_item'
  title: string
  metadata?: Record<string, unknown>
}

export interface AssistantResponse {
  message: string
  suggestedAction?: AssistantSuggestedAction
}

// UI-specific types
export interface CalendarFilter {
  childIds: string[]
  sources: SourceProvider[]
  types: SourceType[]
  statuses: ItemStatus[]
}

export interface CreateLocalTaskInput {
  title: string
  description?: string
  child_id?: string
  due_at?: string
  starts_at?: string
  ends_at?: string
  priority?: string
  visibility?: ItemVisibility
  reward_enabled?: boolean
  points_value?: number
  penalty_points?: number
  deadline_time?: string | null
  requires_parent_approval?: boolean
  is_recurring?: boolean
}

export interface CreateGoogleEventInput {
  title: string
  description?: string
  location?: string
  starts_at: string
  ends_at: string
  all_day?: boolean
}
