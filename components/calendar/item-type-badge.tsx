import { Badge } from '@/components/ui/badge'
import type { SourceType } from '@/types'

const TYPE_MAP: Record<SourceType, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  task: { label: 'משימה', variant: 'secondary' },
  event: { label: 'אירוע', variant: 'default' },
  homework: { label: 'שיעורי בית', variant: 'outline' },
  lesson: { label: 'שיעור', variant: 'secondary' },
  exam: { label: 'מבחן', variant: 'destructive' },
  parent_approval: { label: 'אישור הורה', variant: 'destructive' },
}

export default function ItemTypeBadge({ type }: { type: SourceType }) {
  const { label, variant } = TYPE_MAP[type] || { label: type, variant: 'secondary' }
  return <Badge variant={variant} className="text-xs">{label}</Badge>
}
