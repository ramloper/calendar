'use client'

import { useAuth } from '@/hooks/useAuth'
import { useSchedules } from '@/hooks/useSchedules'
import { useCalendarStore } from '@/stores/calendarStore'
import { useUiStore } from '@/stores/uiStore'
import { getMonthGrid, isSameMonth, isSameDay, isToday } from '@/lib/utils/date'
import { cn } from '@/lib/utils'
import type { Schedule } from '@/types'
import { Timestamp } from 'firebase/firestore'

const PRIORITY_COLORS: Record<string, string> = {
  critical: 'bg-red-500',
  high:     'bg-orange-400',
  medium:   'bg-blue-500',
  low:      'bg-gray-400',
}

const DAYS = ['일', '월', '화', '수', '목', '금', '토']

export function MonthView() {
  const { user } = useAuth()
  const { currentDate, selectedDate, setSelectedDate } = useCalendarStore()
  const { openEditModal } = useUiStore()
  const { data: schedules } = useSchedules(user?.uid ?? null)

  const grid = getMonthGrid(currentDate)

  const getSchedulesForDay = (date: Date): Schedule[] => {
    if (!schedules) return []
    return schedules.filter((s) => {
      const start = s.startAt instanceof Timestamp
        ? s.startAt.toDate()
        : new Date(s.startAt as unknown as string)
      return isSameDay(start, date)
    })
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 rounded-2xl border border-border overflow-hidden">
      {/* 요일 헤더 */}
      <div className="grid grid-cols-7 border-b border-border bg-muted/30">
        {DAYS.map((day, idx) => (
          <div
            key={day}
            className={cn(
              'py-3 text-center text-xs font-medium text-muted-foreground',
              idx === 0 && 'text-red-500',
              idx === 6 && 'text-blue-500'
            )}
          >
            {day}
          </div>
        ))}
      </div>

      {/* 날짜 그리드 */}
      <div className="flex-1 grid grid-cols-7 grid-rows-6 min-h-0">
        {grid.map((date, idx) => {
          const daySchedules = getSchedulesForDay(date)
          const isCurrentMonth = isSameMonth(date, currentDate)
          const isTodayDate = isToday(date)
          const isSelected = selectedDate ? isSameDay(date, selectedDate) : false
          const dayOfWeek = date.getDay()

          return (
            <div
              key={idx}
              onClick={() => setSelectedDate(date)}
              className={cn(
                'border-b border-r border-border p-2 cursor-pointer transition-colors',
                !isCurrentMonth && 'bg-muted/20',
                isSelected && 'bg-primary/5 ring-1 ring-inset ring-primary/30',
                !isSelected && 'hover:bg-accent/50',
                idx % 7 === 6 && 'border-r-0'
              )}
            >
              {/* 날짜 숫자 */}
              <div className="flex items-center justify-center w-7 h-7 mb-1">
                <span
                  className={cn(
                    'w-7 h-7 flex items-center justify-center rounded-full text-sm',
                    !isCurrentMonth && 'text-muted-foreground/40',
                    isCurrentMonth && dayOfWeek === 0 && 'text-red-500',
                    isCurrentMonth && dayOfWeek === 6 && 'text-blue-500',
                    isCurrentMonth && dayOfWeek !== 0 && dayOfWeek !== 6 && 'text-foreground',
                    isTodayDate && 'bg-primary text-primary-foreground font-semibold'
                  )}
                >
                  {date.getDate()}
                </span>
              </div>

              {/* 일정 목록 (최대 3개) */}
              <div className="space-y-0.5">
                {daySchedules.slice(0, 3).map((schedule) => (
                  <button
                    key={schedule.id}
                    onClick={(e) => {
                      e.stopPropagation()
                      openEditModal(schedule.id)
                    }}
                    className={cn(
                      'w-full text-left px-1.5 py-0.5 rounded text-xs truncate flex items-center gap-1',
                      'hover:opacity-80 transition-opacity',
                      schedule.isDone && 'opacity-50 line-through'
                    )}
                    style={{ backgroundColor: schedule.color + '20', color: schedule.color }}
                  >
                    <span
                      className={cn(
                        'w-1.5 h-1.5 rounded-full shrink-0',
                        PRIORITY_COLORS[schedule.priority]
                      )}
                    />
                    {schedule.title}
                  </button>
                ))}
                {daySchedules.length > 3 && (
                  <p className="text-xs text-muted-foreground pl-1">
                    +{daySchedules.length - 3}개
                  </p>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
