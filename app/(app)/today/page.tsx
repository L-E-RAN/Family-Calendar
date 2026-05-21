import { createClient } from '@/lib/supabase/server'
import { getTodayBoard } from '@/lib/today/get-today-board'
import TodayBoard from '@/components/today/today-board'
import TodayDashboard from '@/components/today/today-dashboard'
import type { PetEvent, HomeMaintenanceTask, HomeAsset } from '@/types'

export default async function TodayPage() {
  const supabase = await createClient()
  const board = await getTodayBoard(supabase)
  const profile = board.currentProfile

  const now = new Date().toISOString()
  const in30Days = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)

  const [shoppingRes, petRes, maintenanceRes, warrantyRes] = await Promise.all([
    supabase
      .from('shopping_items')
      .select('id')
      .eq('status', 'active'),

    supabase
      .from('pet_events')
      .select('*')
      .eq('status', 'active')
      .lte('due_at', new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString())
      .order('due_at', { ascending: true })
      .limit(5),

    supabase
      .from('home_maintenance_tasks')
      .select('*')
      .eq('status', 'active')
      .lte('due_at', new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString())
      .order('due_at', { ascending: true })
      .limit(5),

    supabase
      .from('home_assets')
      .select('*')
      .lte('warranty_until', in30Days)
      .gte('warranty_until', new Date().toISOString().slice(0, 10))
      .order('warranty_until', { ascending: true })
      .limit(5),
  ])

  const openShoppingCount = shoppingRes.data?.length ?? 0
  const petDueItems = (petRes.data ?? []) as PetEvent[]
  const maintenanceDueSoon = (maintenanceRes.data ?? []) as HomeMaintenanceTask[]
  const warrantyExpiringSoon = (warrantyRes.data ?? []) as HomeAsset[]

  return (
    <div className="p-4 space-y-2 max-w-2xl mx-auto" dir="rtl">
      <TodayDashboard
        profile={profile}
        openShoppingCount={openShoppingCount}
        petDueItems={petDueItems}
        maintenanceDueSoon={maintenanceDueSoon}
        warrantyExpiringSoon={warrantyExpiringSoon}
      />
      <TodayBoard board={board} />
    </div>
  )
}
