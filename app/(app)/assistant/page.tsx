import AssistantView from '@/components/assistant/assistant-view'

const AI_DISABLED =
  !process.env.AI_PROVIDER ||
  process.env.AI_PROVIDER === 'disabled' ||
  (process.env.AI_PROVIDER === 'anthropic' && !process.env.ANTHROPIC_API_KEY) ||
  (process.env.AI_PROVIDER === 'openai' && !process.env.OPENAI_API_KEY)

export default function AssistantPage() {
  return (
    <div className="p-4 max-w-lg mx-auto" dir="rtl">
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-gray-900">עוזר משפחתי</h1>
        <p className="text-sm text-muted-foreground">שאל כל שאלה על הבית והמשפחה</p>
      </div>
      <AssistantView disabled={AI_DISABLED} />
    </div>
  )
}
