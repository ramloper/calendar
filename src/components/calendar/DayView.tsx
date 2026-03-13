'use client'

import { useEffect, useRef } from 'react'
import { Timestamp } from 'firebase/firestore'
import { useAuth } from '@/hooks/useAuth'
import { useSchedules } from '@/hooks/useSchedules'
import { useCalendarStore } from '@/stores/calendarStore'
import { useUiStore } from '@/stores/uiStore'
import { isSameDay, isToday, formatDate } from '@/lib/utils/date'
import { cn } from '@/lib/utils'
import type { Schedule } from '@/types'

const HOUR_HEIGHT = 64
const HOURS = Array.from({ length: 24 }, (_, i) => i)

function toDate(val: Timestamp | Date | string): Date {
  if (val instanceof Timestamp) return val.toDate()
  if (val instanceof Date) return val
  return new Date(val)
}

function getEventPosition(startAt: Date, endAt: Date) {
  const startMin = startAt.getHours() * 60 + startAt.getMinutes()
  const endMin = endAt.getHours() * 60 + endAt.getMinutes()
  const duration = Math.max(endMin - startMin, 30)
  return {
    top: (startMin / 60) * HOUR_HEIGHT,
    height: (duration / 60) * HOUR_HEIGHT,
  }
}

export function DayView() {
  const { user } = useAuth()
  const { currentDate } = useCalendarStore()
  const { openEditModal, openCreateModal } = useUiStore()
  const { data: schedules } = useSchedules(user?.uid ?? null)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      const now = new Date()
      const scrollTop = (now.getHours() - 1) * HOUR_HEIGHT
      scrollRef.current.scrollTop = Math.max(0, scrollTop)
    }
  }, [])

  const isTodayDate = isToday(currentDate)
  const now = new Date()
  const currentTimeTop = (now.getHours() * 60 + now.getMinutes()) / 60 * HOUR_HEIGHT

  const daySchedules = (schedules ?? []).filter((s) => {
    if (s.isAllDay) return false
    return isSameDay(toDate(s.startAt as Timestamp | Date | string), currentDate)
  })

  const allDaySchedules = (schedules ?? []).filter((s) => {
    if (!s.isAllDay) return false
    return isSameDay(toDate(s.startAt as Timestamp | Date | string), currentDate)
  })

  return (
    <div className="flex-1 flex flex-col min-h-0 rounded-2xl border border-border overflow-hidden">
      {/* 날짜 헤더 */}
      <div className="flex border-b border-border bg-muted/30 shrink-0" style={{ paddingLeft: '56px' }}>
        <div className="flex-1 py-4 text-center">
          <div className={cn(
            'text-xs font-medium mb-1',
            currentDate.getDay() === 0 && 'text-red-500',
            currentDate.getDay() === 6 && 'text-blue-500',
            currentDate.getDay() !== 0 && currentDate.getDay() !== 6 && 'text-muted-foreground'
          )}>
            {['일', '월', '화', '수', '목', '금', '토'][currentDate.getDay()]}
          </div>
          <div className={cn(
            'w-10 h-10 mx-auto flex items-center justify-center rounded-full text-lg font-semibold',
            isTodayDate ? 'bg-primary text-primary-foreground' : 'text-foreground'
          )}>
            {currentDate.getDate()}
          </div>
        </div>
      </div>

      {/* 종일 행 */}
      {allDaySchedules.length > 0 && (
        <div className="flex border-b border-border bg-muted/10 shrink-0">
          <div className="w-14 border-r border-border flex items-center justify-center shrink-0">
            <span className="text-xs text-muted-foreground">종일</span>
          </div>
          <div className="flex-1 p-1.5 space-y-1">
            {allDaySchedules.map((s) => (
              <button
                key={s.id}
                onClick={() => openEditModal(s.id)}
                className="w-full text-left text-xs px-2 py-1 rounded truncate"
                style={{ backgroundColor: s.color + '30', color: s.color }}
              >
                {s.title}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 시간 그리드 */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto scrollbar-hide">
        <div className="relative flex" style={{ height: `${HOUR_HEIGHT * 24}px` }}>
          {/* 시간 레이블 */}
          <div className="w-14 shrink-0 border-r border-border">
            {HOURS.map((h) => (
              <div
                key={h}
                className="flex items-start justify-end pr-2 text-xs text-muted-foreground"
                style={{ height: HOUR_HEIGHT, paddingTop: '2px' }}
              >
                {h === 0 ? '' : `${String(h).padStart(2, '0')}:00`}
              </div>
            ))}
          </div>

          {/* 이벤트 열 */}
          <div
            className="flex-1 relative"
            onClick={() => openCreateModal(currentDate)}
          >
            {/* 시간 구분선 */}
            {HOURS.map((h) => (
              <div
                key={h}
                className="absolute w-full border-t border-border/50"
                style={{ top: h * HOUR_HEIGHT }}
              />
            ))}

            {/* 현재 시각 표시선 */}
            {isTodayDate && (
              <div
                className="absolute w-full z-10 flex items-center pointer-events-none"
                style={{ top: currentTimeTop }}
              >
                <div className="w-2.5 h-2.5 rounded-full bg-red-500 -ml-1.5 shrink-0" />
                <div className="flex-1 h-px bg-red-500" />
              </div>
            )}

            {/* 일정 블록 */}
            {daySchedules.map((s) => {
              const start = toDate(s.startAt as Timestamp | Date | string)
              const end = toDate(s.endAt as Timestamp | Date | string)
              const { top, height } = getEventPosition(start, end)
              return (
                <button
                  key={s.id}
                  onClick={(e) => { e.stopPropagation(); openEditModal(s.id) }}
                  className={cn(
                    'absolute left-1 right-4 rounded-lg px-2 text-left z-20 overflow-hidden',
                    'hover:opacity-80 transition-opacity',
                    s.isDone && 'opacity-50'
                  )}
                  style={{
                    top,
                    height: Math.max(height, 24),
                    backgroundColor: s.color + '25',
                    color: s.color,
                    border: `1px solid ${s.color}60`,
                  }}
                >
                  <div className={cn('text-sm font-medium truncate', s.isDone && 'line-through')}>
                    {s.title}
                  </div>
                  {height >= 44 && (
                    <div className="text-xs opacity-80">
                      {formatDate(start, 'HH:mm')} – {formatDate(end, 'HH:mm')}
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
