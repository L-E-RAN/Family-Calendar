// Supabase Edge Function — send push notifications
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

const VAPID_PUBLIC_KEY = Deno.env.get('VAPID_PUBLIC_KEY')!
const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY')!
const VAPID_EMAIL = Deno.env.get('VAPID_EMAIL') || 'eliran.ashwal@gmail.com'

Deno.serve(async (req) => {
  const body = await req.json().catch(() => ({}))
  const { type } = body // 'homework_due', 'exam_reminder', 'daily_summary', 'parent_approval'

  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000)
  const threeDaysFrom = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000)

  const notifications: Array<{ profileId: string; payload: Record<string, unknown> }> = []

  if (!type || type === 'homework_due') {
    const { data: homework } = await supabase
      .from('calendar_items')
      .select('id, title, child_id, family_id, due_at, child:children(name)')
      .eq('source_type', 'homework')
      .eq('status', 'active')
      .gte('due_at', todayStart.toISOString())
      .lt('due_at', todayEnd.toISOString())

    for (const hw of homework || []) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id')
        .eq('family_id', hw.family_id)
        .in('role', ['family_admin', 'parent'])

      for (const p of profiles || []) {
        notifications.push({
          profileId: p.id,
          payload: {
            title: 'שיעורי בית להגשה היום',
            body: `${hw.title}${hw.child ? ` (${(hw.child as Record<string, string>).name})` : ''}`,
            data: { url: '/today', itemId: hw.id },
          },
        })
      }
    }
  }

  if (!type || type === 'exam_reminder') {
    const { data: exams } = await supabase
      .from('calendar_items')
      .select('id, title, child_id, family_id, starts_at, child:children(name)')
      .eq('source_type', 'exam')
      .gte('starts_at', todayStart.toISOString())
      .lt('starts_at', threeDaysFrom.toISOString())

    for (const exam of exams || []) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id')
        .eq('family_id', exam.family_id)
        .in('role', ['family_admin', 'parent'])

      for (const p of profiles || []) {
        notifications.push({
          profileId: p.id,
          payload: {
            title: 'מבחן קרוב',
            body: `${exam.title}${exam.child ? ` — ${(exam.child as Record<string, string>).name}` : ''}`,
            data: { url: '/today', itemId: exam.id },
          },
        })
      }
    }
  }

  if (!type || type === 'parent_approval') {
    const { data: approvals } = await supabase
      .from('calendar_items')
      .select('id, title, family_id')
      .eq('source_type', 'parent_approval')
      .eq('status', 'needs_action')

    for (const approval of approvals || []) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id')
        .eq('family_id', approval.family_id)
        .in('role', ['family_admin', 'parent'])

      for (const p of profiles || []) {
        notifications.push({
          profileId: p.id,
          payload: {
            title: 'אישור הורה נדרש',
            body: approval.title,
            data: { url: '/today', itemId: approval.id },
          },
        })
      }
    }
  }

  // Send all notifications
  let sent = 0
  for (const { profileId, payload } of notifications) {
    const { data: subs } = await supabase
      .from('push_subscriptions')
      .select('*')
      .eq('profile_id', profileId)

    // Check prefs
    const { data: prefs } = await supabase
      .from('notification_preferences')
      .select('*')
      .eq('profile_id', profileId)
      .eq('channel', 'push')
      .single()

    if (prefs && !prefs.enabled) continue

    for (const sub of subs || []) {
      try {
        await sendWebPush(sub, payload)
        await supabase
          .from('push_subscriptions')
          .update({ last_used_at: new Date().toISOString() })
          .eq('id', sub.id)
        sent++
      } catch (err: unknown) {
        if (String(err).includes('410')) {
          await supabase.from('push_subscriptions').delete().eq('id', sub.id)
        }
      }
    }
  }

  return new Response(JSON.stringify({ ok: true, sent }), { status: 200 })
})

async function sendWebPush(sub: { endpoint: string; p256dh: string; auth: string }, payload: unknown) {
  // Simple VAPID Web Push implementation
  const body = JSON.stringify(payload)
  const res = await fetch(sub.endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'TTL': '3600',
      // In production, generate proper VAPID headers
    },
    body,
  })
  if (!res.ok && res.status !== 201) {
    throw new Error(`Push failed: ${res.status}`)
  }
}
