'use client'

import { useState, useRef } from 'react'
import {
  FileText, Plus, Upload, Search, AlertCircle, Trash2,
  Shield, BookOpen, Heart, Wrench, GraduationCap, PawPrint, Receipt
} from 'lucide-react'
import type { Document, DocumentType } from '@/types'
import { cn } from '@/lib/utils'
import { format, differenceInDays } from 'date-fns'
import { he } from 'date-fns/locale'
import { useRouter } from 'next/navigation'

const TYPE_META: Record<DocumentType, { label: string; icon: React.ElementType; color: string }> = {
  receipt:    { label: 'קבלה',       icon: Receipt,       color: 'bg-gray-100 text-gray-600' },
  warranty:   { label: 'אחריות',     icon: Shield,        color: 'bg-blue-100 text-blue-600' },
  insurance:  { label: 'ביטוח',      icon: Shield,        color: 'bg-indigo-100 text-indigo-600' },
  contract:   { label: 'חוזה',       icon: BookOpen,      color: 'bg-purple-100 text-purple-600' },
  medical:    { label: 'רפואי',      icon: Heart,         color: 'bg-red-100 text-red-600' },
  school:     { label: 'בית ספר',    icon: GraduationCap, color: 'bg-yellow-100 text-yellow-600' },
  pet:        { label: 'חיות מחמד',  icon: PawPrint,      color: 'bg-pink-100 text-pink-600' },
  other:      { label: 'אחר',        icon: FileText,      color: 'bg-gray-100 text-gray-500' },
}

interface Props {
  initialDocs: Document[]
}

export default function DocumentsView({ initialDocs }: Props) {
  const router = useRouter()
  const [docs, setDocs] = useState<Document[]>(initialDocs)
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState<DocumentType | ''>('')
  const [showUpload, setShowUpload] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [form, setForm] = useState({ title: '', type: 'other' as DocumentType, visibility: 'family', notes: '', expires_at: '' })

  const filtered = docs.filter(d => {
    const matchSearch = !search || d.title.toLowerCase().includes(search.toLowerCase())
    const matchType = !filterType || d.type === filterType
    return matchSearch && matchType
  })

  const expiringSoon = docs.filter(d => {
    if (!d.expires_at) return false
    const days = differenceInDays(new Date(d.expires_at), new Date())
    return days >= 0 && days <= 30
  })

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault()
    if (!form.title.trim()) return
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('title', form.title)
      fd.append('type', form.type)
      fd.append('visibility', form.visibility)
      if (form.notes) fd.append('notes', form.notes)
      if (form.expires_at) fd.append('expires_at', form.expires_at)
      const file = fileRef.current?.files?.[0]
      if (file) fd.append('file', file)

      const res = await fetch('/api/documents', { method: 'POST', body: fd })
      const data = await res.json()
      if (res.ok) {
        setDocs(prev => [data, ...prev])
        setShowUpload(false)
        setForm({ title: '', type: 'other', visibility: 'family', notes: '', expires_at: '' })
        if (fileRef.current) fileRef.current.value = ''
      }
    } finally {
      setUploading(false)
    }
  }

  async function deleteDoc(id: string) {
    setDocs(prev => prev.filter(d => d.id !== id))
    await fetch(`/api/documents/${id}`, { method: 'DELETE' })
  }

  return (
    <div dir="rtl" className="space-y-4">
      {/* Expiring soon banner */}
      {expiringSoon.length > 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-3 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-orange-500 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-medium text-orange-800">מסמכים שפגות תוקפם בקרוב</p>
            {expiringSoon.map(d => (
              <p key={d.id} className="text-xs text-orange-700">
                {d.title} — {format(new Date(d.expires_at!), 'd MMM yyyy', { locale: he })}
              </p>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="חיפוש..."
            className="w-full border rounded-xl pr-9 pl-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
          />
        </div>
        <button
          onClick={() => setShowUpload(v => !v)}
          className="flex items-center gap-1 bg-indigo-600 text-white rounded-xl px-4 py-2.5 text-sm font-medium"
        >
          <Plus className="w-4 h-4" />
          הוסף
        </button>
      </div>

      {/* Type filter */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {(['', ...Object.keys(TYPE_META)] as (DocumentType | '')[]).map(type => (
          <button
            key={type}
            onClick={() => setFilterType(type)}
            className={cn(
              'shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors',
              filterType === type ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600'
            )}
          >
            {type === '' ? 'הכל' : TYPE_META[type as DocumentType].label}
          </button>
        ))}
      </div>

      {/* Upload form */}
      {showUpload && (
        <form onSubmit={handleUpload} className="bg-white rounded-xl border shadow-sm p-4 space-y-3">
          <h3 className="font-medium text-gray-800">מסמך חדש</h3>
          <input
            value={form.title}
            onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
            placeholder="שם המסמך"
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
            required
          />
          <div className="grid grid-cols-2 gap-2">
            <select
              value={form.type}
              onChange={e => setForm(f => ({ ...f, type: e.target.value as DocumentType }))}
              className="border rounded-lg px-3 py-2 text-sm"
            >
              {Object.entries(TYPE_META).map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </select>
            <select
              value={form.visibility}
              onChange={e => setForm(f => ({ ...f, visibility: e.target.value }))}
              className="border rounded-lg px-3 py-2 text-sm"
            >
              <option value="family">כל המשפחה</option>
              <option value="parents_only">הורים בלבד</option>
            </select>
          </div>
          <input
            type="date"
            value={form.expires_at}
            onChange={e => setForm(f => ({ ...f, expires_at: e.target.value }))}
            className="w-full border rounded-lg px-3 py-2 text-sm"
            placeholder="תאריך תפוגה (אופציונלי)"
          />
          <textarea
            value={form.notes}
            onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
            placeholder="הערות"
            rows={2}
            className="w-full border rounded-lg px-3 py-2 text-sm resize-none"
          />
          <div className="border-2 border-dashed rounded-lg p-3 text-center cursor-pointer" onClick={() => fileRef.current?.click()}>
            <Upload className="w-5 h-5 mx-auto text-gray-400 mb-1" />
            <p className="text-xs text-gray-500">לחץ להעלאת קובץ (אופציונלי)</p>
            <input ref={fileRef} type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" />
          </div>
          <div className="flex gap-2">
            <button type="submit" disabled={uploading} className="flex-1 bg-indigo-600 text-white rounded-lg py-2 text-sm font-medium disabled:opacity-50">
              {uploading ? 'שומר...' : 'שמור'}
            </button>
            <button type="button" onClick={() => setShowUpload(false)} className="px-4 border rounded-lg text-sm text-gray-600">
              ביטול
            </button>
          </div>
        </form>
      )}

      {/* Document list */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <FileText className="w-10 h-10 mx-auto mb-2 opacity-40" />
          <p className="text-sm">אין מסמכים</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(doc => <DocCard key={doc.id} doc={doc} onDelete={deleteDoc} />)}
        </div>
      )}
    </div>
  )
}

function DocCard({ doc, onDelete }: { doc: Document; onDelete: (id: string) => void }) {
  const meta = TYPE_META[doc.type]
  const Icon = meta.icon
  const isExpiring = doc.expires_at && differenceInDays(new Date(doc.expires_at), new Date()) <= 30

  return (
    <div className="bg-white rounded-xl shadow-sm border p-3 flex items-center gap-3">
      <div className={cn('p-2 rounded-lg shrink-0', meta.color)}>
        <Icon className="w-4 h-4" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate">{doc.title}</p>
        <div className="flex items-center gap-2 text-xs text-gray-400">
          <span>{meta.label}</span>
          {doc.expires_at && (
            <span className={cn(isExpiring ? 'text-orange-600 font-medium' : '')}>
              {isExpiring ? '⚠️' : ''} עד {format(new Date(doc.expires_at), 'd MMM yyyy', { locale: he })}
            </span>
          )}
        </div>
      </div>
      <button onClick={() => onDelete(doc.id)} className="text-gray-300 hover:text-red-400 transition-colors p-1">
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  )
}
