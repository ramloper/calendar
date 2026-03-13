'use client'

import { Plus, CalendarDays, Clock, CheckCircle2, Circle } from 'lucide-react'
import { format, isToday } from 'date-fns'
import { ko } from 'date-fns/locale'
import { Timestamp } from 'firebase/firestore'
import { useAuth } from '@/hooks/useAuth'
import { useSchedules, useToggleScheduleDone } from '@/hooks/useSchedules'
import { useCalendarStore } from '@/stores/calendarStore'
import { useUiStore } from '@/stores/uiStore'
import { isSameDay, formatDate } from '@/lib/utils/date'
import { cn } from '@/lib/utils'
import type { Schedule } from '@/types'

const PRIORITY_COLORS: Record<string, string> = {
  critical: 'bg-red-500',
  high: 'bg-orange-400',
  medium: 'bg-blue-500',
  low: 'bg-gray-400',
}

// Tiptap HTML에서 텍스트만 추출
function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .trim()
}

function toDate(val: Timestamp | Date | string): Date {
  if (val instanceof Timestamp) return val.toDate()
  if (val instanceof Date) return val
  return new Date(val)
}

export function DayDetailPanel() {
  const { user } = useAuth()
  const { selectedDate } = useCalendarStore()
  const { openCreateModal, openEditModal } = useUiStore()
  const { data: schedules } = useSchedules(user?.uid ?? null)
  const toggleDone = useToggleScheduleDone(user?.uid ?? '')

  const date = selectedDate ?? new Date()
  const isTodayDate = isToday(date)

  const daySchedules = (schedules ?? [])
    .filter((s) => isSameDay(toDate(s.startAt as Timestamp | Date | string), date))
    .sort((a, b) => {
      // 종일 일정 먼저, 그 다음 시작 시간순
      if (a.isAllDay && !b.isAllDay) return -1
      if (!a.isAllDay && b.isAllDay) return 1
      return toDate(a.startAt as Timestamp | Date | string).getTime() -
             toDate(b.startAt as Timestamp | Date | string).getTime()
    })

  return (
    <aside className="w-72 border-l border-border flex flex-col bg-background shrink-0">
      {/* 헤더 */}
      <div className="h-14 flex items-center justify-between px-5 border-b border-border shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-foreground">
            {format(date, 'M월 d일 (EEE)', { locale: ko })}
          </span>
          {isTodayDate && (
            <span className="text-xs px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
              오늘
            </span>
          )}
        </div>
        <button
          onClick={() => openCreateModal(date)}
          className="w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/90 transition-colors"
          title="이 날짜에 일정 추가"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {/* 일정 목록 */}
      <div className="flex-1 overflow-y-auto">
        {daySchedules.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 gap-3">
            <CalendarDays className="w-8 h-8 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">일정이 없어요</p>
            <button
              onClick={() => openCreateModal(date)}
              className="text-xs text-primary hover:underline"
            >
              + 일정 추가하기
            </button>
          </div>
        ) : (
          <div className="p-3 space-y-2">
            {daySchedules.map((schedule) => (
              <ScheduleCard
                key={schedule.id}
                schedule={schedule}
                onEdit={() => openEditModal(schedule.id)}
                onToggle={() => {
                  if (!user) return
                  toggleDone.mutate({ scheduleId: schedule.id, isDone: !schedule.isDone })
                }}
              />
            ))}
          </div>
        )}
      </div>
    </aside>
  )
}

// ─── 개별 일정 카드 ────────────────────────────────────────────────────────────

interface ScheduleCardProps {
  schedule: Schedule
  onEdit: () => void
  onToggle: () => void
}

function ScheduleCard({ schedule, onEdit, onToggle }: ScheduleCardProps) {
  const startDate = toDate(schedule.startAt as Timestamp | Date | string)
  const endDate = schedule.endAt
    ? toDate(schedule.endAt as Timestamp | Date | string)
    : null
  const contentPreview = schedule.description ? stripHtml(schedule.description) : ''

  return (
    <div
      onClick={onEdit}
      className={cn(
        'rounded-xl border border-border p-3 hover:bg-accent/50 transition-colors cursor-pointer',
        schedule.isDone && 'opacity-60'
      )}
    >
      <div className="flex items-start gap-2">
        {/* 완료 토글 버튼 */}
        <button
          onClick={(e) => { e.stopPropagation(); onToggle() }}
          className="mt-0.5 shrink-0 text-muted-foreground hover:text-primary transition-colors"
        >
          {schedule.isDone
            ? <CheckCircle2 className="w-4 h-4 text-primary" />
            : <Circle className="w-4 h-4" />
          }
        </button>

        <div className="flex-1 min-w-0">
          {/* 제목 + 중요도 점 */}
          <div className="flex items-center gap-1.5">
            <span className={cn('w-2 h-2 rounded-full shrink-0', PRIORITY_COLORS[schedule.priority])} />
            <span
              className={cn(
                'text-sm font-medium text-foreground truncate',
                schedule.isDone && 'line-through text-muted-foreground'
              )}
            >
              {schedule.title}
            </span>
          </div>

          {/* 시간 (종일 아닌 경우) */}
          {!schedule.isAllDay && (
            <div className="flex items-center gap-1 mt-1">
              <Clock className="w-3 h-3 text-muted-foreground shrink-0" />
              <span className="text-xs text-muted-foreground">
                {formatDate(startDate, 'HH:mm')}
                {endDate && ` – ${formatDate(endDate, 'HH:mm')}`}
              </span>
            </div>
          )}

          {/* 종일 뱃지 */}
          {schedule.isAllDay && (
            <span className="inline-block mt-1 text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
              종일
            </span>
          )}

          {/* 내용 미리보기 */}
          {contentPreview && (
            <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2 leading-relaxed">
              {contentPreview}
            </p>
          )}

        </div>
      </div>
    </div>
  )
}
