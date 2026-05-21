import { createClient } from '@/lib/supabase/server'
import ShoppingView from '@/components/shopping/shopping-view'
import type { ShoppingList, ShoppingItem } from '@/types'

export default async function ShoppingPage() {
  const supabase = await createClient()

  const [listsRes, itemsRes] = await Promise.all([
    supabase
      .from('shopping_lists')
      .select('*')
      .order('is_default', { ascending: false })
      .order('created_at', { ascending: true }),
    supabase
      .from('shopping_items')
      .select('*')
      .neq('status', 'archived')
      .order('status', { ascending: true })
      .order('created_at', { ascending: true }),
  ])

  const lists = (listsRes.data ?? []) as ShoppingList[]
  const items = (itemsRes.data ?? []) as ShoppingItem[]
  const defaultList = lists.find(l => l.is_default) ?? lists[0] ?? null

  return (
    <div className="p-4 max-w-lg mx-auto" dir="rtl">
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-gray-900">קניות</h1>
        <p className="text-sm text-muted-foreground">רשימת הקניות המשפחתית</p>
      </div>
      <ShoppingView
        initialLists={lists}
        initialItems={items}
        defaultListId={defaultList?.id ?? null}
      />
    </div>
  )
}
