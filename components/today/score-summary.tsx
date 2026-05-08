import { Star } from 'lucide-react'

interface Props {
  score: number
}

export default function ScoreSummary({ score }: Props) {
  return (
    <div className="flex items-center gap-1.5 text-sm font-medium text-amber-600">
      <Star className="w-4 h-4 fill-amber-400 stroke-amber-500" />
      <span>{score} נק׳</span>
    </div>
  )
}
