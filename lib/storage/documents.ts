import type { SupabaseClient } from '@supabase/supabase-js'

export const DOCUMENTS_BUCKET = 'family-documents'

export function getDocumentStoragePath(familyId: string, documentId: string, fileName: string) {
  return `${familyId}/${documentId}/${fileName}`
}

export async function uploadDocument(
  supabase: SupabaseClient,
  familyId: string,
  documentId: string,
  file: File
) {
  const path = getDocumentStoragePath(familyId, documentId, file.name)
  const { data, error } = await supabase.storage
    .from(DOCUMENTS_BUCKET)
    .upload(path, file, { upsert: true, contentType: file.type })
  if (error) throw error
  return { path: data.path }
}

export async function getDocumentUrl(supabase: SupabaseClient, storagePath: string) {
  const { data } = await supabase.storage
    .from(DOCUMENTS_BUCKET)
    .createSignedUrl(storagePath, 60 * 60) // 1 hour
  return data?.signedUrl ?? null
}

export async function deleteDocument(supabase: SupabaseClient, storagePath: string) {
  const { error } = await supabase.storage
    .from(DOCUMENTS_BUCKET)
    .remove([storagePath])
  if (error) throw error
}
