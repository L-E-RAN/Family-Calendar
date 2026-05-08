import { createClient } from '@/lib/supabase/server'
import { getTodayBoard } from '@/lib/today/get-today-board'
import TabletBoard from '@/components/tablet/tablet-board'

export default async function TabletPage() {
  const supabase = await createClient()
  const board = await getTodayBoard(supabase, new Date(), { tabletMode: true })

  return <TabletBoard board={board} />
}
