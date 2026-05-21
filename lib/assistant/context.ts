import type { SupabaseClient } from '@supabase/supabase-js'

export interface AssistantContext {
  familyName: string
  profileName: string
  date: string
  todayEvents: { title: string; time: string }[]
  overdueTasks: { title: string; dueAt: string | null }[]
  openShoppingItems: { title: string; quantity: string | null }[]
  petDueItems: { petName: string; title: string; dueAt: string | null }[]
  warrantyExpiringSoon: { name: string; warrantyUntil: string | null; daysLeft: number }[]
  maintenanceDueSoon: { title: string; dueAt: string | null; overdue: boolean }[]
}

export async function buildAssistantContext(
  supabase: SupabaseClient,
  familyId: string,
  familyName: string,
  profileName: string
): Promise<AssistantContext> {
  const today = new Date()
  const todayStr = today.toISOString().slice(0, 10)
  const tomorrowStr = new Date(Date.now() + 86400000).toISOString().slice(0, 10)
  const in30 = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10)

  const [eventsRes, tasksRes, shoppingRes, petEventsRes, assetsRes, maintenanceRes] = await Promise.all([
    supabase.from('calendar_items').select('title, starts_at, ends_at, all_day').eq('status', 'active').gte('starts_at', todayStr).lt('starts_at', tomorrowStr).limit(10),
    supabase.from('calendar_items').select('title, due_at').eq('status', 'active').eq('source_type', 'task').lte('due_at', today.toISOString()).limit(10),
    supabase.from('shopping_items').select('title, quantity').eq('status', 'active').limit(20),
    supabase.from('pet_events').select('title, due_at, pet_id, pets(name)').eq('status', 'active').lte('due_at', new Date(Date.now() + 7 * 86400000).toISOString()).limit(10),
    supabase.from('home_assets').select('name, warranty_until').lte('warranty_until', in30).gte('warranty_until', todayStr).limit(10),
    supabase.from('home_maintenance_tasks').select('title, due_at').eq('status', 'active').lte('due_at', new Date(Date.now() + 14 * 86400000).toISOString()).limit(10),
  ])

  return {
    familyName,
    profileName,
    date: today.toLocaleDateString('he-IL', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
    todayEvents: (eventsRes.data ?? []).map(e => ({
      title: e.title,
      time: e.all_day ? 'כל היום' : e.starts_at ? new Date(e.starts_at).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' }) : '',
    })),
    overdueTasks: (tasksRes.data ?? []).map(t => ({ title: t.title, dueAt: t.due_at })),
    openShoppingItems: (shoppingRes.data ?? []).map(i => ({ title: i.title, quantity: i.quantity })),
    petDueItems: (petEventsRes.data ?? []).map((e: Record<string, unknown>) => ({
      petName: (e.pets as { name: string } | null)?.name ?? 'חיית מחמד',
      title: e.title as string,
      dueAt: e.due_at as string | null,
    })),
    warrantyExpiringSoon: (assetsRes.data ?? []).map(a => ({
      name: a.name,
      warrantyUntil: a.warranty_until,
      daysLeft: a.warranty_until ? Math.ceil((new Date(a.warranty_until).getTime() - Date.now()) / 86400000) : 0,
    })),
    maintenanceDueSoon: (maintenanceRes.data ?? []).map(t => ({
      title: t.title,
      dueAt: t.due_at,
      overdue: t.due_at ? new Date(t.due_at) < today : false,
    })),
  }
}
