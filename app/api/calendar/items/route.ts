import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { CalendarFilter } from '@/types'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const start = searchParams.get('start')
  const end = searchParams.get('end')
  const childIds = searchParams.getAll('childIds')
  const sources = searchParams.getAll('sources')
  const types = searchParams.getAll('types')
  const statuses = searchParams.getAll('statuses')

  let query = supabase
    .from('calendar_items')
    .select(`
      *,
      child:children(id, name, color),
      overlay:calendar_item_overlays(*)
    `)
    .neq('status', 'hidden')
    .order('starts_at', { ascending: true })

  if (start) {
    query = query.or(`starts_at.gte.${start},due_at.gte.${start}`)
  }
  if (end) {
    query = query.or(`starts_at.lte.${end},due_at.lte.${end}`)
  }
  if (childIds.length > 0) {
    query = query.in('child_id', childIds)
  }
  if (sources.length > 0) {
    query = query.in('source_provider', sources)
  }
  if (types.length > 0) {
    query = query.in('source_type', types)
  }
  if (statuses.length > 0) {
    query = query.in('status', statuses)
  }

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ items: data })
}
