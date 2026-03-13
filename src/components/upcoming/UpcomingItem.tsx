'use client'

import { getDDayLabel, getDDayNumber, formatDate } from '@/lib/utils/date'
import { useUiStore } from '@/stores/uiStore'
import type { Schedule } from '@/types'
import { cn } from '@/lib/utils'

interface Props {
  schedule: Schedule
}

const PRIORITY_COLORS: Record<string, string> = {
  critical: 'bg-red-500',
  high:     'bg-orange-400',
  medium:   'bg-blue-500',
  low:      'bg-gray-400',
}

export function UpcomingItem({ schedule }: Props) {
  const { openEditModal } = useUiStore()
  const dday = getDDayNumber(schedule.startAt.toDate())
  const label = getDDayLabel(schedule.startAt.toDate())

  const isUrgent = dday <= 1

  return (
    <button
      onClick={() => openEditModal(schedule.id)}
      className="w-full text-left p-3 rounded-xl border border-border hover:bg-accent transition-colors"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          {/* 중요도 색상 점 */}
          <span
            className={cn(
              'w-2 h-2 rounded-full shrink-0 mt-0.5',
              PRIORITY_COLORS[schedule.priority]
            )}
          />
          <span className="text-sm font-medium text-foreground truncate">
            {schedule.title}
          </span>
        </div>

        {/* D-Day 배지 */}
        <span
          className={cn(
            'text-xs font-semibold px-2 py-0.5 rounded-full shrink-0',
            isUrgent
              ? 'bg-red-100 text-red-600 dark:bg-red-950 dark:text-red-400'
              : 'bg-muted text-muted-foreground'
          )}
        >
          {label}
        </span>
      </div>

      <p className="text-xs text-muted-foreground mt-1.5 pl-4">
        {schedule.isAllDay
          ? formatDate(schedule.startAt.toDate(), 'M월 d일')
          : formatDate(schedule.startAt.toDate(), 'M월 d일 HH:mm')}
      </p>
    </button>
  )
}
