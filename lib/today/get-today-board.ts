import type { SupabaseClient } from '@supabase/supabase-js'
import { startOfDay, endOfDay, format } from 'date-fns'
import type {
  Profile,
  Child,
  CalendarItem,
  DailyItemCompletion,
  ScreenTimeRewardTier,
  TodayBoard,
  TodayBoardMember,
  TodayBoardItem,
} from '@/types'
import { calculateScore } from '@/lib/rewards/calculate-score'
import { calculateScreenTime } from '@/lib/rewards/calculate-screen-time'

const MAX_COLUMNS = 3

export async function getTodayBoard(
  supabase: SupabaseClient,
  date: Date = new Date(),
): Promise<TodayBoard> {
  const dateStr = format(date, 'yyyy-MM-dd')
  const todayStart = startOfDay(date).toISOString()
  const todayEnd = endOfDay(date).toISOString()
  const twoWeeks = new Date(date.getTime() + 14 * 24 * 60 * 60 * 1000).toISOString()

  // Current user
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const { data: currentProfile } = await supabase
    .from('profiles')
    .select('*')
    .eq('auth_user_id', user.id)
    .single()

  if (!currentProfile) throw new Error('Profile not found')

  // All family profiles
  const { data: allProfiles } = await supabase
    .from('profiles')
    .select('*')
    .eq('family_id', currentProfile.family_id)

  // All children
  const { data: allChildren } = await supabase
    .from('children')
    .select('*')
    .eq('family_id', currentProfile.family_id)
    .order('created_at')

  const profiles: Profile[] = allProfiles || []
  const children: Child[] = allChildren || []

  const parentProfiles = profiles.filter(p => p.role !== 'child')
  const activeChildren = children.filter(c => c.active)
  const inactiveChildren = children.filter(c => !c.active)

  // Fetch today's items in separate targeted queries (avoids complex nested PostgREST or/and)
  const base = () =>
    supabase
      .from('calendar_items')
      .select('*, child:children(id, name, color), overlay:calendar_item_overlays(*)')
      .eq('family_id', currentProfile.family_id)
      .neq('status', 'hidden')
      .neq('status', 'cancelled')

  const [
    { data: lessons },
    { data: exams },
    { data: homeworkDue },
    { data: homeworkOpen },
    { data: tasks },
    { data: approvals },
    { data: events },
  ] = await Promise.all([
    base().eq('source_type', 'lesson').gte('starts_at', todayStart).lte('starts_at', todayEnd),
    base().eq('source_type', 'exam').gte('starts_at', todayStart).lte('starts_at', twoWeeks),
    base().eq('source_type', 'homework').gte('due_at', todayStart),
    base().eq('source_type', 'homework').is('due_at', null),
    base().eq('source_type', 'task').eq('status', 'active'),
    base().eq('source_type', 'parent_approval').eq('status', 'needs_action'),
    base().eq('source_type', 'event').gte('starts_at', todayStart).lte('starts_at', todayEnd),
  ])

  // Dedupe homework (open + due today may overlap if due_at is set)
  const homeworkById = new Map<string, CalendarItem>()
  for (const h of [...(homeworkDue || []), ...(homeworkOpen || [])]) {
    homeworkById.set(h.id, h)
  }

  const items: CalendarItem[] = [
    ...(lessons || []),
    ...(exams || []),
    ...Array.from(homeworkById.values()),
    ...(tasks || []),
    ...(approvals || []),
    ...(events || []),
  ]

  // Fetch all today's completions
  const { data: rawCompletions } = await supabase
    .from('daily_item_completions')
    .select('*')
    .eq('family_id', currentProfile.family_id)
    .eq('completion_date', dateStr)

  const completions: DailyItemCompletion[] = rawCompletions || []
  const completionByItemProfile = new Map<string, DailyItemCompletion>()
  for (const c of completions) {
    completionByItemProfile.set(`${c.item_id}:${c.profile_id}`, c)
  }

  // Fetch screen time tiers for all children
  const { data: rawTiers } = await supabase
    .from('screen_time_reward_tiers')
    .select('*')
    .eq('family_id', currentProfile.family_id)
    .eq('active', true)
    .order('min_points')

  const tiers: ScreenTimeRewardTier[] = rawTiers || []

  function getCompletionForMember(
    item: CalendarItem,
    profile: Profile | null,
  ): DailyItemCompletion | null {
    if (!profile) return null
    return completionByItemProfile.get(`${item.id}:${profile.id}`) ?? null
  }

  function canComplete(item: CalendarItem, profile: Profile | null): boolean {
    if (!profile) return false
    if (item.source_provider === 'mashov') return false
    const done = getCompletionForMember(item, profile)
    if (done && ['completed', 'approved', 'completed_pending_approval', 'late', 'missed'].includes(done.status)) return false
    if (profile.role === 'child') {
      return item.child_id === profile.child_id
    }
    return true
  }

  function canApprove(item: CalendarItem, profile: Profile | null, viewerProfile: Profile): boolean {
    if (viewerProfile.role === 'child') return false
    const completion = getCompletionForMember(item, profile)
    return !!completion && completion.status === 'completed_pending_approval'
  }

  function buildItemsForMember(
    memberProfile: Profile | null,
    childRecord: Child | null,
  ): TodayBoardItem[] {
    const isChildMember = !!childRecord
    const childId = childRecord?.id ?? null

    const memberItems = items.filter(item => {
      if (isChildMember) {
        return item.child_id === childId
      }
      // Parent column: family-wide items (no child assigned)
      return item.child_id === null
    })

    return memberItems.map(item => ({
      item,
      completion: getCompletionForMember(item, memberProfile),
      canComplete: canComplete(item, memberProfile),
      canApprove: canApprove(item, memberProfile, currentProfile),
    }))
  }

  function buildMemberScore(memberProfile: Profile | null, childId: string | null): number {
    const memberCompletions = completions.filter(c =>
      memberProfile ? c.profile_id === memberProfile.id : c.child_id === childId
    )
    return calculateScore(memberCompletions)
  }

  function buildScreenTime(childId: string | null): ReturnType<typeof calculateScreenTime> {
    if (!childId) return { earnedMinutes: 0, currentTier: null, nextTier: null, pointsNeededForNext: null }
    const childProfile = profiles.find(p => p.child_id === childId) ?? null
    const score = buildMemberScore(childProfile, childId)
    return calculateScreenTime(score, tiers)
  }

  const columns: TodayBoardMember[] = []

  // Child columns only
  const childSlots = MAX_COLUMNS
  for (let i = 0; i < childSlots; i++) {
    const child = activeChildren[i] ?? null
    if (!child) {
      // Inactive or future slot
      const inactive = inactiveChildren[i - activeChildren.length] ?? null
      columns.push({
        type: inactive ? 'child' : 'placeholder',
        profile: null,
        child: inactive,
        items: [],
        totalScore: 0,
        earnedScreenMinutes: 0,
        nextTierMinutes: null,
        nextTierPointsNeeded: null,
        nextTierLabel: null,
      })
      continue
    }
    const childProfile = profiles.find(p => p.child_id === child.id) ?? null
    const memberItems = buildItemsForMember(childProfile, child)
    const screenTime = buildScreenTime(child.id)
    const score = buildMemberScore(childProfile, child.id)
    columns.push({
      type: 'child',
      profile: childProfile,
      child,
      items: memberItems,
      totalScore: score,
      earnedScreenMinutes: screenTime.earnedMinutes,
      nextTierMinutes: screenTime.nextTier?.screen_time_minutes ?? null,
      nextTierPointsNeeded: screenTime.pointsNeededForNext,
      nextTierLabel: screenTime.nextTier?.label ?? null,
    })
  }

  return { date: dateStr, columns, currentProfile }
}
