// Supabase Edge Function — evaluate missed/late reward deadlines
// Runs every 15 minutes via cron (see 004_cron.sql or schedule separately).
// For each reward-enabled item whose deadline_time has passed today,
// if no completion row exists, inserts one with status='missed' and penalty applied.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

function todayDateString(timezone = 'Asia/Jerusalem'): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: timezone })
}

function timeToMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}

function nowMinutes(timezone = 'Asia/Jerusalem'): number {
  const now = new Date()
  const parts = now.toLocaleTimeString('en-GB', { timeZone: timezone, hour12: false }).split(':').map(Number)
  return parts[0] * 60 + parts[1]
}

Deno.serve(async (_req) => {
  const timezone = 'Asia/Jerusalem'
  const today = todayDateString(timezone)
  const nowMins = nowMinutes(timezone)

  // Fetch all families
  const { data: families } = await supabase.from('families').select('id, timezone')
  if (!families) return new Response('no families', { status: 200 })

  let processed = 0
  let errors = 0

  for (const family of families) {
    const tz = family.timezone || timezone
    const familyToday = todayDateString(tz)
    const familyNowMins = nowMinutes(tz)

    // Reward-enabled items with a deadline_time that has passed
    const { data: items } = await supabase
      .from('calendar_items')
      .select('id, family_id, child_id, deadline_time, penalty_points, points_value')
      .eq('family_id', family.id)
      .eq('reward_enabled', true)
      .not('deadline_time', 'is', null)
      .neq('status', 'hidden')
      .neq('status', 'cancelled')

    if (!items || items.length === 0) continue

    for (const item of items) {
      const deadlineMins = timeToMinutes(item.deadline_time)
      if (familyNowMins <= deadlineMins) continue // deadline not yet passed

      // Get all profiles that could be responsible for this item
      let profileQuery = supabase
        .from('profiles')
        .select('id, role, child_id')
        .eq('family_id', family.id)

      if (item.child_id) {
        profileQuery = profileQuery.eq('child_id', item.child_id)
      } else {
        profileQuery = profileQuery.in('role', ['family_admin', 'parent'])
      }

      const { data: profiles } = await profileQuery
      if (!profiles || profiles.length === 0) continue

      for (const profile of profiles) {
        // Check if completion already exists for today
        const { data: existing } = await supabase
          .from('daily_item_completions')
          .select('id, status')
          .eq('item_id', item.id)
          .eq('profile_id', profile.id)
          .eq('completion_date', familyToday)
          .maybeSingle()

        if (existing) continue // already has a completion row — no duplicate penalty

        // Insert missed record with penalty
        const { error } = await supabase
          .from('daily_item_completions')
          .insert({
            family_id: family.id,
            item_id: item.id,
            profile_id: profile.id,
            child_id: item.child_id ?? null,
            completion_date: familyToday,
            status: 'missed',
            points_awarded: 0,
            penalty_applied: item.penalty_points ?? 0,
          })

        if (error) {
          console.error(`Failed to insert missed completion for item ${item.id} profile ${profile.id}:`, error.message)
          errors++
        } else {
          processed++
        }
      }
    }
  }

  return new Response(
    JSON.stringify({ ok: true, processed, errors, evaluatedAt: new Date().toISOString() }),
    { headers: { 'Content-Type': 'application/json' } }
  )
})
