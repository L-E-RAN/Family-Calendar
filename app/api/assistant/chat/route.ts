import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { buildAssistantContext } from '@/lib/assistant/context'
import { buildSystemPrompt } from '@/lib/assistant/prompts'
import { extractSuggestedAction, cleanResponseText } from '@/lib/assistant/actions'

const AI_PROVIDER = process.env.AI_PROVIDER ?? 'disabled'
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY
const OPENAI_API_KEY = process.env.OPENAI_API_KEY

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, family_id, display_name')
    .eq('auth_user_id', user.id)
    .single()

  if (!profile) return NextResponse.json({ error: 'No profile' }, { status: 401 })

  const { data: family } = await supabase
    .from('families')
    .select('name')
    .eq('id', profile.family_id)
    .single()

  const { messages } = await req.json() as { messages: { role: string; content: string }[] }

  // Save user message
  const userMsg = messages[messages.length - 1]
  if (userMsg?.role === 'user') {
    await supabase.from('assistant_messages').insert({
      family_id: profile.family_id,
      profile_id: profile.id,
      role: 'user',
      content: userMsg.content,
    })
  }

  // No AI configured
  const providerDisabled =
    AI_PROVIDER === 'disabled' ||
    (AI_PROVIDER === 'anthropic' && !ANTHROPIC_API_KEY) ||
    (AI_PROVIDER === 'openai' && !OPENAI_API_KEY)

  if (providerDisabled) {
    const msg = 'העוזר החכם עדיין לא מחובר. צריך להגדיר מפתח API כדי להפעיל אותו.'
    return NextResponse.json({ message: msg, disabled: true })
  }

  const ctx = await buildAssistantContext(supabase as never, profile.family_id, family?.name ?? 'המשפחה', profile.display_name)
  const systemPrompt = buildSystemPrompt(ctx)

  let assistantText = ''

  if (AI_PROVIDER === 'anthropic' && ANTHROPIC_API_KEY) {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1024,
        system: systemPrompt,
        messages: messages.map(m => ({ role: m.role, content: m.content })),
      }),
    })
    const data = await res.json()
    assistantText = data.content?.[0]?.text ?? 'שגיאה בתקשורת עם העוזר.'
  } else if (AI_PROVIDER === 'openai' && OPENAI_API_KEY) {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        max_tokens: 1024,
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages.map(m => ({ role: m.role, content: m.content })),
        ],
      }),
    })
    const data = await res.json()
    assistantText = data.choices?.[0]?.message?.content ?? 'שגיאה בתקשורת עם העוזר.'
  }

  const suggestedAction = extractSuggestedAction(assistantText)
  const cleanText = cleanResponseText(assistantText)

  // Save assistant reply
  await supabase.from('assistant_messages').insert({
    family_id: profile.family_id,
    profile_id: profile.id,
    role: 'assistant',
    content: cleanText,
    metadata: suggestedAction ? { suggestedAction } : {},
  })

  return NextResponse.json({ message: cleanText, suggestedAction })
}
