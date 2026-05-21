import { createClient } from '@/lib/supabase/server'
import AssetsView from '@/components/assets/assets-view'
import type { HomeAsset } from '@/types'

export default async function AssetsPage() {
  const supabase = await createClient()

  const { data } = await supabase
    .from('home_assets')
    .select('*')
    .order('name', { ascending: true })

  const assets = (data ?? []) as HomeAsset[]

  return (
    <div className="p-4 max-w-lg mx-auto" dir="rtl">
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-gray-900">מוצרי הבית</h1>
        <p className="text-sm text-muted-foreground">מעקב מוצרים, אחריות וקבלות</p>
      </div>
      <AssetsView initialAssets={assets} />
    </div>
  )
}
