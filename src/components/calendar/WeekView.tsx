'use client'

import { useEffect, useRef } from 'react'
import { Timestamp } from 'firebase/firestore'
import { useAuth } from '@/hooks/useAuth'
import { useSchedules } from '@/hooks/useSchedules'
import { useCalendarStore } from '@/stores/calendarStore'
import { useUiStore } from '@/stores/uiStore'
import { getWeekDays, isSameDay, isToday, formatDate } from '@/lib/utils/date'
import { cn } from '@/lib/utils'
import type { Schedule } from '@/types'

const HOUR_HEIGHT = 64 // px per hour
const HOURS = Array.from({ length: 24 }, (_, i) => i)
const DAYS = ['일', '월', '화', '수', '목', '금', '토']

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

export function WeekView() {
  const { user } = useAuth()
  const { currentDate, selectedDate, setSelectedDate } = useCalendarStore()
  const { openEditModal, openCreateModal } = useUiStore()
  const { data: schedules } = useSchedules(user?.uid ?? null)
  const scrollRef = useRef<HTMLDivElement>(null)

  const weekDays = getWeekDays(currentDate)

  // 현재 시각으로 스크롤
  useEffect(() => {
    if (scrollRef.current) {
      const now = new Date()
      const scrollTop = (now.getHours() - 1) * HOUR_HEIGHT
      scrollRef.current.scrollTop = Math.max(0, scrollTop)
    }
  }, [])

  const getSchedulesForDay = (date: Date): Schedule[] => {
    if (!schedules) return []
    return schedules.filter((s) => {
      if (s.isAllDay) return false
      return isSameDay(toDate(s.startAt as Timestamp | Date | string), date)
    })
  }

  const getAllDaySchedulesForDay = (date: Date): Schedule[] => {
    if (!schedules) return []
    return schedules.filter((s) => {
      if (!s.isAllDay) return false
      return isSameDay(toDate(s.startAt as Timestamp | Date | string), date)
    })
  }

  const now = new Date()
  const currentTimeTop = (now.getHours() * 60 + now.getMinutes()) / 60 * HOUR_HEIGHT

  return (
    <div className="flex-1 flex flex-col min-h-0 rounded-2xl border border-border overflow-hidden">
      {/* 헤더 행: 빈 칸 + 7일 */}
      <div className="grid border-b border-border bg-muted/30 shrink-0" style={{ gridTemplateColumns: '56px repeat(7, 1fr)' }}>
        <div className="border-r border-border" />
        {weekDays.map((date, idx) => {
          const isTodayDate = isToday(date)
          const isSelected = selectedDate ? isSameDay(date, selectedDate) : false
          const dayOfWeek = date.getDay()
          return (
            <div
              key={idx}
              onClick={() => setSelectedDate(date)}
              className={cn(
                'py-3 text-center cursor-pointer border-r border-border last:border-r-0 hover:bg-accent/50 transition-colors',
                isSelected && 'bg-primary/5'
              )}
            >
              <div className={cn(
                'text-xs font-medium mb-1',
                dayOfWeek === 0 && 'text-red-500',
                dayOfWeek === 6 && 'text-blue-500',
                dayOfWeek !== 0 && dayOfWeek !== 6 && 'text-muted-foreground'
              )}>
                {DAYS[dayOfWeek]}
              </div>
              <div className={cn(
                'w-8 h-8 mx-auto flex items-center justify-center rounded-full text-sm font-medium',
                isTodayDate && 'bg-primary text-primary-foreground',
                !isTodayDate && 'text-foreground'
              )}>
                {date.getDate()}
              </div>
            </div>
          )
        })}
      </div>

      {/* 종일 행 */}
      <div className="grid border-b border-border bg-muted/10 shrink-0" style={{ gridTemplateColumns: '56px repeat(7, 1fr)' }}>
        <div className="border-r border-border flex items-center justify-center">
          <span className="text-xs text-muted-foreground">종일</span>
        </div>
        {weekDays.map((date, idx) => {
          const allDays = getAllDaySchedulesForDay(date)
          return (
            <div key={idx} className="border-r border-border last:border-r-0 min-h-[32px] p-1 space-y-0.5">
              {allDays.map((s) => (
                <button
                  key={s.id}
                  onClick={() => openEditModal(s.id)}
                  className="w-full text-left text-xs px-1.5 py-0.5 rounded truncate"
                  style={{ backgroundColor: s.color + '30', color: s.color }}
                >
                  {s.title}
                </button>
              ))}
            </div>
          )
        })}
      </div>

      {/* 시간 그리드 (스크롤) */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto scrollbar-hide">
        <div className="relative grid" style={{ gridTemplateColumns: '56px repeat(7, 1fr)', height: `${HOUR_HEIGHT * 24}px` }}>
          {/* 시간 레이블 열 */}
          <div className="border-r border-border">
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

          {/* 각 요일 열 */}
          {weekDays.map((date, colIdx) => {
            const daySchedules = getSchedulesForDay(date)
            const isCurrentDay = isToday(date)

            return (
              <div
                key={colIdx}
                className="relative border-r border-border last:border-r-0"
                onClick={() => {
                  setSelectedDate(date)
                  openCreateModal(date)
                }}
              >
                {/* 시간 구분선 */}
                {HOURS.map((h) => (
                  <div
                    key={h}
                    className="absolute w-full border-t border-border/50"
                    style={{ top: h * HOUR_HEIGHT }}
                  />
                ))}

                {/* 현재 시각 표시선 (오늘 열에만) */}
                {isCurrentDay && (
                  <div
                    className="absolute w-full z-10 flex items-center pointer-events-none"
                    style={{ top: currentTimeTop }}
                  >
                    <div className="w-2 h-2 rounded-full bg-red-500 -ml-1 shrink-0" />
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
                        'absolute left-0.5 right-0.5 rounded px-1.5 text-xs text-left z-20 overflow-hidden',
                        'hover:opacity-80 transition-opacity',
                        s.isDone && 'opacity-50'
                      )}
                      style={{
                        top,
                        height: Math.max(height, 22),
                        backgroundColor: s.color + '30',
                        color: s.color,
                        border: `1px solid ${s.color}60`,
                      }}
                    >
                      <span className={cn('font-medium', s.isDone && 'line-through')}>
                        {s.title}
                      </span>
                      {height >= 40 && (
                        <div className="opacity-80">
                          {formatDate(start, 'HH:mm')}
                        </div>
                      )}
                    </button>
                  )
                })}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
