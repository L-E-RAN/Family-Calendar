'use client'

import { useState, useEffect, useCallback } from 'react'
import { Plus, Check, RotateCcw, Trash2, ShoppingCart } from 'lucide-react'
import type { ShoppingList, ShoppingItem } from '@/types'
import { cn } from '@/lib/utils'
import { useRouter } from 'next/navigation'

interface Props {
  initialLists: ShoppingList[]
  initialItems: ShoppingItem[]
  defaultListId: string | null
}

export default function ShoppingView({ initialLists, initialItems, defaultListId }: Props) {
  const router = useRouter()
  const [lists, setLists] = useState<ShoppingList[]>(initialLists)
  const [items, setItems] = useState<ShoppingItem[]>(initialItems)
  const [activeListId, setActiveListId] = useState<string | null>(defaultListId ?? initialLists[0]?.id ?? null)
  const [newItem, setNewItem] = useState('')
  const [loading, setLoading] = useState(false)
  const [showCompleted, setShowCompleted] = useState(false)

  const activeItems = items.filter(i => i.list_id === activeListId)
  const openItems = activeItems.filter(i => i.status === 'active')
  const completedItems = activeItems.filter(i => i.status === 'completed')

  async function addItem(e: React.FormEvent) {
    e.preventDefault()
    if (!newItem.trim() || !activeListId) return
    setLoading(true)
    try {
      const res = await fetch('/api/shopping/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newItem.trim(), list_id: activeListId }),
      })
      const data = await res.json()
      if (res.ok) {
        setItems(prev => [...prev, data])
        setNewItem('')
      }
    } finally {
      setLoading(false)
    }
  }

  async function toggleItem(item: ShoppingItem) {
    const newStatus = item.status === 'active' ? 'completed' : 'active'
    setItems(prev => prev.map(i => i.id === item.id ? { ...i, status: newStatus } : i))
    await fetch(`/api/shopping/items/${item.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    })
  }

  async function deleteItem(id: string) {
    setItems(prev => prev.filter(i => i.id !== id))
    await fetch(`/api/shopping/items/${id}`, { method: 'DELETE' })
  }

  async function createDefaultList() {
    setLoading(true)
    try {
      const res = await fetch('/api/shopping/lists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'רשימת קניות', is_default: true }),
      })
      const list = await res.json()
      if (res.ok) {
        setLists([list])
        setActiveListId(list.id)
        router.refresh()
      }
    } finally {
      setLoading(false)
    }
  }

  if (lists.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20 text-center" dir="rtl">
        <ShoppingCart className="w-12 h-12 text-gray-300" />
        <p className="text-gray-500">אין רשימת קניות</p>
        <button
          onClick={createDefaultList}
          disabled={loading}
          className="bg-indigo-600 text-white rounded-xl px-6 py-3 font-medium disabled:opacity-50"
        >
          צור רשימת קניות
        </button>
      </div>
    )
  }

  return (
    <div dir="rtl" className="space-y-4">
      {/* List tabs */}
      {lists.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {lists.map(list => (
            <button
              key={list.id}
              onClick={() => setActiveListId(list.id)}
              className={cn(
                'shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-colors',
                activeListId === list.id
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 text-gray-600'
              )}
            >
              {list.name}
            </button>
          ))}
        </div>
      )}

      {/* Add item */}
      <form onSubmit={addItem} className="flex gap-2">
        <input
          value={newItem}
          onChange={e => setNewItem(e.target.value)}
          placeholder="הוסף פריט..."
          className="flex-1 border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white"
          disabled={loading}
        />
        <button
          type="submit"
          disabled={loading || !newItem.trim()}
          className="bg-indigo-600 text-white rounded-xl px-4 py-3 disabled:opacity-50"
        >
          <Plus className="w-5 h-5" />
        </button>
      </form>

      {/* Open items */}
      {openItems.length === 0 ? (
        <div className="text-center py-10 text-gray-400">
          <ShoppingCart className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">הרשימה ריקה — הוסף פריטים למעלה</p>
        </div>
      ) : (
        <div className="space-y-2">
          {openItems.map(item => (
            <ItemRow key={item.id} item={item} onToggle={toggleItem} onDelete={deleteItem} />
          ))}
        </div>
      )}

      {/* Completed items */}
      {completedItems.length > 0 && (
        <div>
          <button
            onClick={() => setShowCompleted(v => !v)}
            className="text-sm text-gray-500 flex items-center gap-1 mb-2"
          >
            <Check className="w-4 h-4" />
            {completedItems.length} פריטים הושלמו {showCompleted ? '▲' : '▼'}
          </button>
          {showCompleted && (
            <div className="space-y-2 opacity-60">
              {completedItems.map(item => (
                <ItemRow key={item.id} item={item} onToggle={toggleItem} onDelete={deleteItem} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function ItemRow({
  item,
  onToggle,
  onDelete,
}: {
  item: ShoppingItem
  onToggle: (item: ShoppingItem) => void
  onDelete: (id: string) => void
}) {
  const done = item.status === 'completed'
  return (
    <div className={cn(
      'flex items-center gap-3 bg-white rounded-xl p-3 shadow-sm border transition-all',
      done && 'opacity-60'
    )}>
      <button
        onClick={() => onToggle(item)}
        className={cn(
          'w-7 h-7 rounded-full border-2 flex items-center justify-center transition-colors shrink-0',
          done ? 'bg-green-500 border-green-500 text-white' : 'border-gray-300'
        )}
      >
        {done && <Check className="w-4 h-4" />}
      </button>
      <div className="flex-1 min-w-0">
        <p className={cn('text-sm font-medium', done && 'line-through text-gray-400')}>
          {item.title}
        </p>
        {item.quantity && <p className="text-xs text-gray-400">{item.quantity}</p>}
      </div>
      <button
        onClick={() => onDelete(item.id)}
        className="text-gray-300 hover:text-red-400 transition-colors p-1"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  )
}
