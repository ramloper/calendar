import { cn } from '@/lib/utils'
import type { Priority } from '@/types'

interface Props {
  priority: Priority
  className?: string
}

const CONFIG: Record<Priority, { label: string; className: string }> = {
  critical: {
    label: '긴급',
    className: 'bg-red-100 text-red-600 dark:bg-red-950 dark:text-red-400',
  },
  high: {
    label: '높음',
    className: 'bg-orange-100 text-orange-600 dark:bg-orange-950 dark:text-orange-400',
  },
  medium: {
    label: '보통',
    className: 'bg-blue-100 text-blue-600 dark:bg-blue-950 dark:text-blue-400',
  },
  low: {
    label: '낮음',
    className: 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400',
  },
}

export function PriorityBadge({ priority, className }: Props) {
  const { label, className: colorClass } = CONFIG[priority]
  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
        colorClass,
        className
      )}
    >
      {label}
    </span>
  )
}
