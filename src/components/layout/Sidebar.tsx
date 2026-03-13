'use client'

import { CalendarDays, Plus, Clock, Settings } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useUiStore } from '@/stores/uiStore'
import { useCalendarStore } from '@/stores/calendarStore'
import { useAuth } from '@/hooks/useAuth'
import { useUpcoming } from '@/hooks/useUpcoming'
import { formatDate, getMonthGrid, isSameMonth, isSameDay, isToday } from '@/lib/utils/date'
import { getDDayLabel, getDDayNumber } from '@/lib/utils/date'
import { cn } from '@/lib/utils'
import type { Schedule } from '@/types'

const PRIORITY_COLORS: Record<string, string> = {
  critical: 'bg-red-500',
  high: 'bg-orange-400',
  medium: 'bg-blue-500',
  low: 'bg-gray-400',
}

export function Sidebar() {
  const { openCreateModal, openSettingsModal } = useUiStore()
  const { currentDate, selectedDate, setSelectedDate, setCurrentDate } = useCalendarStore()
  const { user } = useAuth()
  const { data: upcomingSchedules, isLoading: upcomingLoading } = useUpcoming(user?.uid ?? null)

  const grid = getMonthGrid(currentDate)

  return (
    <aside className="w-64 border-r border-border flex flex-col bg-background shrink-0">
      {/* 로고 */}
      <div className="h-14 flex items-center px-5 border-b border-border shrink-0">
        <CalendarDays className="w-5 h-5 text-primary mr-2" />
        <span className="font-semibold text-foreground">캘린더</span>
      </div>

      {/* 일정 추가 버튼 */}
      <div className="p-4 shrink-0">
        <Button
          onClick={() => openCreateModal()}
          className="w-full h-10 font-medium"
        >
          <Plus className="w-4 h-4 mr-2" />
          새 일정
        </Button>
      </div>

      {/* 미니 캘린더 */}
      <div className="px-4 pb-4 shrink-0">
        {/* 헤더 */}
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium text-foreground">
            {formatDate(currentDate, 'yyyy년 M월')}
          </span>
        </div>

        {/* 요일 헤더 */}
        <div className="grid grid-cols-7 mb-1">
          {['일', '월', '화', '수', '목', '금', '토'].map((day, idx) => (
            <div
              key={day}
              className={cn(
                'text-center text-xs py-1 font-medium',
                idx === 0 && 'text-red-500',
                idx === 6 && 'text-blue-500',
                idx !== 0 && idx !== 6 && 'text-muted-foreground'
              )}
            >
              {day}
            </div>
          ))}
        </div>

        {/* 날짜 그리드 */}
        <div className="grid grid-cols-7 gap-y-1">
          {grid.map((date, idx) => {
            const isCurrentMonth = isSameMonth(date, currentDate)
            const isSelected = selectedDate ? isSameDay(date, selectedDate) : false
            const isTodayDate = isToday(date)
            const dayOfWeek = date.getDay()
            const isSunday = dayOfWeek === 0
            const isSaturday = dayOfWeek === 6

            return (
              <button
                key={idx}
                onClick={() => {
                  setSelectedDate(date)
                  setCurrentDate(date)
                }}
                className={cn(
                  'w-7 h-7 mx-auto text-xs rounded-full flex items-center justify-center transition-colors',
                  isSelected && 'bg-primary text-primary-foreground hover:bg-primary font-medium',
                  !isSelected && isTodayDate && 'text-primary font-semibold',
                  !isSelected && !isTodayDate && isCurrentMonth && isSunday && 'text-red-500 hover:bg-accent',
                  !isSelected && !isTodayDate && isCurrentMonth && isSaturday && 'text-blue-500 hover:bg-accent',
                  !isSelected && !isTodayDate && isCurrentMonth && !isSunday && !isSaturday && 'text-foreground hover:bg-accent',
                  !isCurrentMonth && 'text-muted-foreground/30',
                )}
              >
                {date.getDate()}
              </button>
            )
          })}
        </div>
      </div>

      {/* 구분선 */}
      <div className="border-t border-border mx-4 shrink-0" />

      {/* 마감 임박 섹션 */}
      <div className="flex flex-col flex-1 min-h-0">
        <div className="flex items-center gap-2 px-4 py-3 shrink-0">
          <Clock className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            마감 임박
          </span>
        </div>

        <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-1.5">
          {upcomingLoading && (
            <div className="flex items-center justify-center h-16">
              <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          )}

          {!upcomingLoading && (!upcomingSchedules || upcomingSchedules.length === 0) && (
            <div className="flex items-center justify-center h-16">
              <p className="text-xs text-muted-foreground">다가오는 일정이 없어요</p>
            </div>
          )}

          {!upcomingLoading && upcomingSchedules && upcomingSchedules.map((schedule) => (
            <SidebarUpcomingItem key={schedule.id} schedule={schedule} />
          ))}
        </div>
      </div>

      {/* 하단 설정 버튼 */}
      <div className="px-3 py-3 border-t border-border shrink-0">
        <button
          onClick={openSettingsModal}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors text-sm"
        >
          <Settings className="w-4 h-4" />
          알림 설정
        </button>
      </div>
    </aside>
  )
}

function SidebarUpcomingItem({ schedule }: { schedule: Schedule }) {
  const { openEditModal } = useUiStore()
  const endDate = schedule.endAt.toDate()
  const dday = getDDayNumber(endDate)
  const label = getDDayLabel(endDate)
  const isUrgent = dday <= 1

  return (
    <button
      onClick={() => openEditModal(schedule.id)}
      className="w-full text-left px-3 py-2 rounded-lg hover:bg-accent transition-colors"
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', PRIORITY_COLORS[schedule.priority])} />
          <span className="text-xs text-foreground truncate">{schedule.title}</span>
        </div>
        <span
          className={cn(
            'text-xs font-semibold px-1.5 py-0.5 rounded-full shrink-0',
            isUrgent
              ? 'bg-red-100 text-red-600 dark:bg-red-950 dark:text-red-400'
              : 'bg-muted text-muted-foreground'
          )}
        >
          {label}
        </span>
      </div>
    </button>
  )
}
