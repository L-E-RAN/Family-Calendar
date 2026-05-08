import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getTodayBoard } from '@/lib/today/get-today-board'
import { parseISO, isValid } from 'date-fns'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const dateParam = searchParams.get('date')
  let date = new Date()
  if (dateParam) {
    const parsed = parseISO(dateParam)
    if (isValid(parsed)) date = parsed
  }

  try {
    const board = await getTodayBoard(supabase, date)
    return NextResponse.json({ board })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
