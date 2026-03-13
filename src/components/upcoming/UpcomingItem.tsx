'use client'
// updated
import { getDDayLabel, getDDayNumber, formatDate } from '@/lib/utils/date'
import { toDate, isMultiDay } from '@/lib/utils/multiday'
import { useUiStore } from '@/stores/uiStore'
import type { Schedule } from '@/types'
import { cn } from '@/lib/utils'
import { Timestamp } from 'firebase/firestore'
import { isSameDay } from 'date-fns'

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

  const startDate = toDate(schedule.startAt as Timestamp | Date | string)
  const endDate   = toDate(schedule.endAt   as Timestamp | Date | string)
  const today     = new Date()

  // D-Day: 항상 종료일 기준 (마감 임박 패널)
  const isOngoing = startDate <= today && endDate >= today
  const dday      = getDDayNumber(endDate)
  const label     = getDDayLabel(endDate)

  const isUrgent  = dday <= 1
  const multiDay  = isMultiDay(schedule) || !isSameDay(startDate, endDate)

  // 날짜 표시 텍스트
  function dateText() {
    if (multiDay) {
      const startStr = formatDate(startDate, 'M월 d일')
      const endStr   = formatDate(endDate, 'M월 d일')
      return `${startStr} ~ ${endStr}`
    }
    if (schedule.isAllDay) {
      return formatDate(startDate, 'M월 d일')
    }
    return formatDate(startDate, 'M월 d일 HH:mm')
  }

  // 진행 중 배지
  const showOngoingBadge = isOngoing && multiDay

  return (
    <button
      onClick={() => openEditModal(schedule.id)}
      className="w-full text-left p-3 rounded-xl border border-border hover:bg-accent transition-colors"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
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

        <div className="flex flex-col items-end gap-1 shrink-0">
          {/* 진행 중 배지 */}
          {showOngoingBadge && (
            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400">
              진행 중
            </span>
          )}
          {/* D-Day 배지 */}
          <span
            className={cn(
              'text-xs font-semibold px-2 py-0.5 rounded-full',
              isUrgent
                ? 'bg-red-100 text-red-600 dark:bg-red-950 dark:text-red-400'
                : 'bg-muted text-muted-foreground'
            )}
          >
            {label}
          </span>
        </div>
      </div>

      <p className="text-xs text-muted-foreground mt-1.5 pl-4">
        {dateText()}
      </p>
    </button>
  )
}
