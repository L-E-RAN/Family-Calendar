// Supabase Edge Function — purge old cached calendar items
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

Deno.serve(async () => {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
  const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString()

  const results: Record<string, number> = {}

  // Delete external items older than 30 days (google + mashov)
  const { count: extDeleted } = await supabase
    .from('calendar_items')
    .delete({ count: 'exact' })
    .in('source_provider', ['google_calendar', 'mashov'])
    .or(`starts_at.lt.${thirtyDaysAgo},due_at.lt.${thirtyDaysAgo}`)

  results.external_items_deleted = extDeleted || 0

  // Delete completed/cancelled local tasks older than 30 days
  const { count: localDeleted } = await supabase
    .from('calendar_items')
    .delete({ count: 'exact' })
    .eq('source_provider', 'local')
    .in('status', ['completed', 'cancelled'])
    .lt('updated_at', thirtyDaysAgo)

  results.local_tasks_deleted = localDeleted || 0

  // Delete sync logs older than 60 days
  const { count: logsDeleted } = await supabase
    .from('sync_logs')
    .delete({ count: 'exact' })
    .lt('created_at', sixtyDaysAgo)

  results.logs_deleted = logsDeleted || 0

  return new Response(JSON.stringify({ ok: true, results }), { status: 200 })
})
