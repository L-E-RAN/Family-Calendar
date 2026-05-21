import { createClient } from '@/lib/supabase/server'
import DocumentsView from '@/components/documents/documents-view'
import type { Document } from '@/types'

export default async function DocumentsPage() {
  const supabase = await createClient()

  const { data } = await supabase
    .from('documents')
    .select('*')
    .order('created_at', { ascending: false })

  const docs = (data ?? []) as Document[]

  return (
    <div className="p-4 max-w-lg mx-auto" dir="rtl">
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-gray-900">מסמכים ואחריות</h1>
        <p className="text-sm text-muted-foreground">קבלות, אחריות, ביטוחים ומסמכים משפחתיים</p>
      </div>
      <DocumentsView initialDocs={docs} />
    </div>
  )
}
