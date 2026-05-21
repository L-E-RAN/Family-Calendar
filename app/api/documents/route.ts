import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { uploadDocument, DOCUMENTS_BUCKET, getDocumentStoragePath } from '@/lib/storage/documents'

export async function GET(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const type = searchParams.get('type')

  let query = supabase
    .from('documents')
    .select('*')
    .order('created_at', { ascending: false })

  if (type) query = query.eq('type', type)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, family_id, role')
    .eq('auth_user_id', user.id)
    .single()

  if (!profile) return NextResponse.json({ error: 'No profile' }, { status: 401 })
  if (!['family_admin', 'parent'].includes(profile.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const formData = await req.formData()
  const title = formData.get('title') as string
  const type = (formData.get('type') as string) || 'other'
  const visibility = (formData.get('visibility') as string) || 'family'
  const notes = formData.get('notes') as string | null
  const expires_at = formData.get('expires_at') as string | null
  const related_entity_type = formData.get('related_entity_type') as string | null
  const related_entity_id = formData.get('related_entity_id') as string | null
  const file = formData.get('file') as File | null

  if (!title?.trim()) return NextResponse.json({ error: 'כותרת חסרה' }, { status: 400 })

  // Create document record first to get ID
  const { data: doc, error: docError } = await supabase
    .from('documents')
    .insert({
      family_id: profile.family_id,
      uploaded_by_profile_id: profile.id,
      title: title.trim(),
      type,
      visibility,
      notes: notes || null,
      expires_at: expires_at || null,
      related_entity_type: related_entity_type || null,
      related_entity_id: related_entity_id || null,
      file_name: file?.name ?? null,
      mime_type: file?.type ?? null,
      size_bytes: file?.size ?? null,
    })
    .select()
    .single()

  if (docError) return NextResponse.json({ error: docError.message }, { status: 500 })

  // Upload file if provided
  if (file) {
    try {
      const { path } = await uploadDocument(supabase as never, profile.family_id, doc.id, file)
      await supabase
        .from('documents')
        .update({ storage_path: path })
        .eq('id', doc.id)
      doc.storage_path = path
    } catch (err) {
      // Document created, file upload failed — still return doc
      console.error('File upload failed', err)
    }
  }

  return NextResponse.json(doc, { status: 201 })
}
