import { createClient } from '@/lib/supabase/server'
import MaintenanceView from '@/components/maintenance/maintenance-view'
import type { HomeMaintenanceTask } from '@/types'

export default async function MaintenancePage() {
  const supabase = await createClient()

  const { data } = await supabase
    .from('home_maintenance_tasks')
    .select('*')
    .in('status', ['active'])
    .order('due_at', { ascending: true, nullsFirst: false })

  const tasks = (data ?? []) as HomeMaintenanceTask[]

  return (
    <div className="p-4 max-w-lg mx-auto" dir="rtl">
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-gray-900">תחזוקת הבית</h1>
        <p className="text-sm text-muted-foreground">משימות תחזוקה שוטפות</p>
      </div>
      <MaintenanceView initialTasks={tasks} />
    </div>
  )
}
