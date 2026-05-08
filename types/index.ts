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
  child_id: string
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
}

export interface CreateGoogleEventInput {
  title: string
  description?: string
  location?: string
  starts_at: string
  ends_at: string
  all_day?: boolean
}
