import { createClient } from '@/lib/supabase/server'
import { getTodayBoard } from '@/lib/today/get-today-board'
import TodayBoard from '@/components/today/today-board'

export default async function TodayPage() {
  const supabase = await createClient()
  const board = await getTodayBoard(supabase)

  return <TodayBoard board={board} />
}
