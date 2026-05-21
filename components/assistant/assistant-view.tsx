'use client'

import { useState, useRef, useEffect } from 'react'
import { Bot, Send, Plus, CheckSquare, ShoppingCart } from 'lucide-react'
import type { AssistantSuggestedAction } from '@/types'
import { cn } from '@/lib/utils'

interface Message {
  role: 'user' | 'assistant'
  content: string
  suggestedAction?: AssistantSuggestedAction
}

const SUGGESTED_PROMPTS = [
  'מה יש היום?',
  'מה יש השבוע?',
  'מה דחוף?',
  'מה צריך לקנות?',
  "מה מצב צ'ארלי?",
  'איזו אחריות עומדת לפוג?',
]

const ACTION_LABELS: Record<AssistantSuggestedAction['type'], string> = {
  create_shopping_item: 'הוסף לקניות',
  create_task: 'צור משימה',
  create_pet_event: "הוסף לצ'ארלי",
  create_maintenance_task: 'הוסף לתחזוקה',
  create_inbox_item: 'הוסף לתיבה',
}

const ACTION_ICONS: Record<AssistantSuggestedAction['type'], React.ElementType> = {
  create_shopping_item: ShoppingCart,
  create_task: CheckSquare,
  create_pet_event: Bot,
  create_maintenance_task: Bot,
  create_inbox_item: Plus,
}

interface Props {
  disabled?: boolean
}

export default function AssistantView({ disabled }: Props) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [confirmedActions, setConfirmedActions] = useState<Set<number>>(new Set())
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function sendMessage(text: string) {
    if (!text.trim() || loading) return
    const userMsg: Message = { role: 'user', content: text }
    const history = [...messages, userMsg]
    setMessages(history)
    setInput('')
    setLoading(true)

    try {
      const res = await fetch('/api/assistant/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: history.map(m => ({ role: m.role, content: m.content })) }),
      })
      const data = await res.json()
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: data.message,
        suggestedAction: data.suggestedAction,
      }])
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'שגיאה בתקשורת. נסה שוב.' }])
    } finally {
      setLoading(false)
    }
  }

  async function executeAction(action: AssistantSuggestedAction, idx: number) {
    const endpoints: Record<AssistantSuggestedAction['type'], { url: string; body: Record<string, unknown> }> = {
      create_shopping_item: { url: '/api/shopping/items', body: { title: action.title, list_id: 'default' } },
      create_task: { url: '/api/calendar/local-tasks', body: { title: action.title } },
      create_pet_event: { url: '/api/inbox', body: { title: action.title, raw_input: action.title } },
      create_maintenance_task: { url: '/api/maintenance', body: { title: action.title } },
      create_inbox_item: { url: '/api/inbox', body: { title: action.title } },
    }

    const ep = endpoints[action.type]
    // For shopping item, we need a real list_id — send to inbox instead if unknown
    if (action.type === 'create_shopping_item' && ep.body.list_id === 'default') {
      // Fallback: add to inbox for now
      await fetch('/api/inbox', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: action.title, raw_input: action.title }),
      })
    } else {
      await fetch(ep.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(ep.body),
      })
    }

    setConfirmedActions(prev => new Set(prev).add(idx))
  }

  return (
    <div dir="rtl" className="flex flex-col h-[calc(100vh-9rem)]">
      {/* Disabled state */}
      {disabled && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4 text-sm text-amber-800">
          <Bot className="w-5 h-5 inline-block ml-2 text-amber-600" />
          העוזר החכם עדיין לא מחובר. צריך להגדיר מפתח API כדי להפעיל אותו.
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-3 pb-2">
        {messages.length === 0 && (
          <div className="text-center py-8">
            <Bot className="w-10 h-10 mx-auto mb-3 text-indigo-300" />
            <p className="text-gray-500 text-sm mb-4">שאל אותי כל דבר על המשפחה</p>
            <div className="grid grid-cols-2 gap-2">
              {SUGGESTED_PROMPTS.map(p => (
                <button
                  key={p}
                  onClick={() => sendMessage(p)}
                  disabled={disabled || loading}
                  className="text-xs bg-white border rounded-xl px-3 py-2 text-gray-700 hover:bg-indigo-50 hover:border-indigo-300 transition-colors disabled:opacity-50"
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, idx) => (
          <div key={idx} className={cn('flex', msg.role === 'user' ? 'justify-start' : 'justify-end')}>
            <div className={cn(
              'max-w-[85%] rounded-2xl px-4 py-3 text-sm',
              msg.role === 'user'
                ? 'bg-indigo-600 text-white rounded-tr-sm'
                : 'bg-white border shadow-sm text-gray-800 rounded-tl-sm'
            )}>
              {msg.role === 'assistant' && <Bot className="w-3.5 h-3.5 inline-block ml-1 text-indigo-400 mb-0.5" />}
              <span className="whitespace-pre-wrap">{msg.content}</span>

              {msg.suggestedAction && !confirmedActions.has(idx) && (
                <div className="mt-3 pt-2 border-t border-gray-100">
                  <p className="text-xs text-gray-500 mb-2">האם לבצע?</p>
                  <button
                    onClick={() => executeAction(msg.suggestedAction!, idx)}
                    className="flex items-center gap-1.5 bg-indigo-50 text-indigo-700 rounded-lg px-3 py-2 text-xs font-medium hover:bg-indigo-100 transition-colors"
                  >
                    {ACTION_LABELS[msg.suggestedAction.type]}
                    <span className="font-semibold">"{msg.suggestedAction.title}"</span>
                  </button>
                </div>
              )}
              {msg.suggestedAction && confirmedActions.has(idx) && (
                <p className="mt-2 text-xs text-green-600">✓ בוצע</p>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-end">
            <div className="bg-white border rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
              <div className="flex gap-1">
                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form
        onSubmit={e => { e.preventDefault(); sendMessage(input) }}
        className="flex gap-2 pt-2 border-t bg-white"
      >
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder={disabled ? 'העוזר לא מחובר' : 'שאל...'}
          disabled={disabled || loading}
          className="flex-1 border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 disabled:opacity-50 disabled:bg-gray-50"
        />
        <button
          type="submit"
          disabled={disabled || loading || !input.trim()}
          className="bg-indigo-600 text-white rounded-xl px-4 py-3 disabled:opacity-50"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  )
}
