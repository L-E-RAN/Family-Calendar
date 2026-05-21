import { createClient } from '@/lib/supabase/server'
import InboxView from '@/components/inbox/inbox-view'
import type { FamilyInboxItem } from '@/types'

export default async function InboxPage() {
  const supabase = await createClient()

  const { data } = await supabase
    .from('family_inbox_items')
    .select('*')
    .in('status', ['inbox', 'triaged'])
    .order('created_at', { ascending: false })

  const items = (data ?? []) as FamilyInboxItem[]

  return (
    <div className="p-4 max-w-lg mx-auto" dir="rtl">
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-gray-900">תיבת משפחה</h1>
        <p className="text-sm text-muted-foreground">לכידה מהירה של דברים לעשות</p>
      </div>
      <InboxView initialItems={items} />
    </div>
  )
}
