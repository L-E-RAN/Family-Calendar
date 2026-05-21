import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { calcNextDue } from '@/lib/maintenance/next-due'

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const updates: Record<string, unknown> = { ...body }

  // If completing a recurring task, calculate next due date and keep active
  if (body.status === 'completed') {
    const { data: existing } = await supabase
      .from('home_maintenance_tasks')
      .select('repeat_rule')
      .eq('id', id)
      .single()

    const now = new Date()
    updates.last_completed_at = now.toISOString()

    if (existing?.repeat_rule) {
      const nextDue = calcNextDue(now, existing.repeat_rule)
      if (nextDue) {
        updates.status = 'active'
        updates.due_at = nextDue.toISOString()
      }
    }
  }

  const { data, error } = await supabase
    .from('home_maintenance_tasks')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { error } = await supabase.from('home_maintenance_tasks').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
