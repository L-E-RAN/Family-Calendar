'use client'

import { useState } from 'react'
import { Package, Plus, Search, AlertCircle, Trash2, ChevronRight } from 'lucide-react'
import type { HomeAsset } from '@/types'
import { cn } from '@/lib/utils'
import { format, differenceInDays } from 'date-fns'
import { he } from 'date-fns/locale'

interface Props {
  initialAssets: HomeAsset[]
}

const CATEGORIES = ['מוצרי חשמל', 'רכב', 'מזגן', 'מכשירי מטבח', 'ריהוט', 'אחר']

export default function AssetsView({ initialAssets }: Props) {
  const [assets, setAssets] = useState<HomeAsset[]>(initialAssets)
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [form, setForm] = useState({
    name: '', category: '', brand: '', model: '',
    serial_number: '', purchase_date: '', purchase_store: '',
    purchase_price: '', warranty_until: '', notes: '',
  })

  const filtered = assets.filter(a =>
    !search ||
    a.name.toLowerCase().includes(search.toLowerCase()) ||
    a.brand?.toLowerCase().includes(search.toLowerCase()) ||
    a.serial_number?.toLowerCase().includes(search.toLowerCase())
  )

  const expiringSoon = assets.filter(a => {
    if (!a.warranty_until) return false
    const days = differenceInDays(new Date(a.warranty_until), new Date())
    return days >= 0 && days <= 30
  })

  async function addAsset(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      const res = await fetch('/api/assets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (res.ok) {
        setAssets(prev => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)))
        setShowForm(false)
        setForm({ name: '', category: '', brand: '', model: '', serial_number: '', purchase_date: '', purchase_store: '', purchase_price: '', warranty_until: '', notes: '' })
      }
    } finally {
      setSaving(false)
    }
  }

  async function deleteAsset(id: string) {
    setAssets(prev => prev.filter(a => a.id !== id))
    await fetch(`/api/assets/${id}`, { method: 'DELETE' })
  }

  return (
    <div dir="rtl" className="space-y-4">
      {expiringSoon.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-yellow-600 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-medium text-yellow-800">אחריות פגה בקרוב</p>
            {expiringSoon.map(a => (
              <p key={a.id} className="text-xs text-yellow-700">
                {a.name} — עד {format(new Date(a.warranty_until!), 'd MMM yyyy', { locale: he })}
              </p>
            ))}
          </div>
        </div>
      )}

      <div className="flex gap-2">
        <div className="flex-1 relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="חיפוש מוצר, מותג, מספר סידורי..."
            className="w-full border rounded-xl pr-9 pl-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
          />
        </div>
        <button
          onClick={() => setShowForm(v => !v)}
          className="flex items-center gap-1 bg-indigo-600 text-white rounded-xl px-4 py-2.5 text-sm font-medium"
        >
          <Plus className="w-4 h-4" />
          הוסף
        </button>
      </div>

      {showForm && (
        <form onSubmit={addAsset} className="bg-white rounded-xl border shadow-sm p-4 space-y-3">
          <h3 className="font-medium text-gray-800">מוצר חדש</h3>
          <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="שם המוצר *" required className="w-full border rounded-lg px-3 py-2 text-sm" />
          <div className="grid grid-cols-2 gap-2">
            <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} className="border rounded-lg px-3 py-2 text-sm">
              <option value="">קטגוריה</option>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <input value={form.brand} onChange={e => setForm(f => ({ ...f, brand: e.target.value }))} placeholder="יצרן/מותג" className="border rounded-lg px-3 py-2 text-sm" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <input value={form.model} onChange={e => setForm(f => ({ ...f, model: e.target.value }))} placeholder="דגם" className="border rounded-lg px-3 py-2 text-sm" />
            <input value={form.serial_number} onChange={e => setForm(f => ({ ...f, serial_number: e.target.value }))} placeholder="מספר סידורי" className="border rounded-lg px-3 py-2 text-sm" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-gray-500">תאריך קנייה</label>
              <input type="date" value={form.purchase_date} onChange={e => setForm(f => ({ ...f, purchase_date: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm mt-0.5" />
            </div>
            <div>
              <label className="text-xs text-gray-500">אחריות עד</label>
              <input type="date" value={form.warranty_until} onChange={e => setForm(f => ({ ...f, warranty_until: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm mt-0.5" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <input value={form.purchase_store} onChange={e => setForm(f => ({ ...f, purchase_store: e.target.value }))} placeholder="חנות" className="border rounded-lg px-3 py-2 text-sm" />
            <input type="number" value={form.purchase_price} onChange={e => setForm(f => ({ ...f, purchase_price: e.target.value }))} placeholder="מחיר (₪)" className="border rounded-lg px-3 py-2 text-sm" />
          </div>
          <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="הערות" rows={2} className="w-full border rounded-lg px-3 py-2 text-sm resize-none" />
          <div className="flex gap-2">
            <button type="submit" disabled={saving} className="flex-1 bg-indigo-600 text-white rounded-lg py-2 text-sm font-medium disabled:opacity-50">{saving ? 'שומר...' : 'שמור'}</button>
            <button type="button" onClick={() => setShowForm(false)} className="px-4 border rounded-lg text-sm text-gray-600">ביטול</button>
          </div>
        </form>
      )}

      {filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Package className="w-10 h-10 mx-auto mb-2 opacity-40" />
          <p className="text-sm">אין מוצרים</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(asset => (
            <AssetCard key={asset.id} asset={asset} expanded={expandedId === asset.id} onExpand={() => setExpandedId(id => id === asset.id ? null : asset.id)} onDelete={deleteAsset} />
          ))}
        </div>
      )}
    </div>
  )
}

function AssetCard({ asset, expanded, onExpand, onDelete }: { asset: HomeAsset; expanded: boolean; onExpand: () => void; onDelete: (id: string) => void }) {
  const warrantyDays = asset.warranty_until ? differenceInDays(new Date(asset.warranty_until), new Date()) : null
  const warrantyUrgent = warrantyDays !== null && warrantyDays >= 0 && warrantyDays <= 30
  const warrantyExpired = warrantyDays !== null && warrantyDays < 0

  return (
    <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
      <div className="flex items-center gap-3 p-3 cursor-pointer" onClick={onExpand}>
        <div className="p-2 bg-gray-100 rounded-lg">
          <Package className="w-4 h-4 text-gray-600" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 truncate">{asset.name}</p>
          <p className="text-xs text-gray-400">{[asset.brand, asset.category].filter(Boolean).join(' · ')}</p>
        </div>
        {warrantyUrgent && <span className="text-xs text-orange-600 font-medium shrink-0">⚠️ {warrantyDays}י</span>}
        {warrantyExpired && <span className="text-xs text-red-500 shrink-0">פג</span>}
        <ChevronRight className={cn('w-4 h-4 text-gray-400 transition-transform', expanded && 'rotate-90')} />
      </div>
      {expanded && (
        <div className="border-t px-3 py-3 space-y-1">
          {asset.model && <p className="text-xs text-gray-600">דגם: {asset.model}</p>}
          {asset.serial_number && <p className="text-xs text-gray-600">מ"ס: {asset.serial_number}</p>}
          {asset.purchase_date && <p className="text-xs text-gray-600">נקנה: {format(new Date(asset.purchase_date), 'd MMM yyyy', { locale: he })}{asset.purchase_store ? ` ב${asset.purchase_store}` : ''}{asset.purchase_price ? ` — ₪${asset.purchase_price}` : ''}</p>}
          {asset.warranty_until && (
            <p className={cn('text-xs', warrantyUrgent ? 'text-orange-600 font-medium' : warrantyExpired ? 'text-red-500' : 'text-gray-600')}>
              אחריות: {format(new Date(asset.warranty_until), 'd MMM yyyy', { locale: he })} {warrantyExpired ? '(פגה)' : warrantyUrgent ? `(${warrantyDays} ימים)` : ''}
            </p>
          )}
          {asset.notes && <p className="text-xs text-gray-500 mt-1">{asset.notes}</p>}
          <div className="flex justify-end pt-1">
            <button onClick={() => onDelete(asset.id)} className="flex items-center gap-1 text-xs text-gray-400 hover:text-red-400">
              <Trash2 className="w-3.5 h-3.5" />
              מחק
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
