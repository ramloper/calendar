'use client'

import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useCalendarStore } from '@/stores/calendarStore'
import { formatDate, getWeekDays } from '@/lib/utils/date'

export function CalendarHeader() {
  const { currentDate, view, setView, goPrev, goNext, goToToday } = useCalendarStore()

  const dateLabel = (() => {
    if (view === 'month') return formatDate(currentDate, 'yyyy년 M월')
    if (view === 'week') {
      const days = getWeekDays(currentDate)
      const first = days[0]
      const last = days[6]
      if (first.getMonth() === last.getMonth()) {
        return formatDate(first, 'yyyy년 M월 d일') + ' – ' + formatDate(last, 'd일')
      }
      return formatDate(first, 'M월 d일') + ' – ' + formatDate(last, 'M월 d일')
    }
    return formatDate(currentDate, 'yyyy년 M월 d일 (EEE)')
  })()

  return (
    <div className="flex items-center justify-between shrink-0">
      {/* 날짜 + 네비게이션 */}
      <div className="flex items-center gap-3">
        <h2 className="text-xl font-bold text-foreground min-w-[180px]">
          {dateLabel}
        </h2>
        <div className="flex items-center">
          <Button variant="ghost" size="icon" onClick={goPrev} className="w-8 h-8">
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={goNext} className="w-8 h-8">
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
        <Button variant="outline" size="sm" onClick={goToToday} className="h-8 text-xs">
          오늘
        </Button>
      </div>

      {/* 뷰 전환 탭 */}
      <div className="flex items-center bg-muted rounded-lg p-1">
        {(['month', 'week', 'day'] as const).map((v) => (
          <button
            key={v}
            onClick={() => setView(v)}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              view === v
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {v === 'month' ? '월' : v === 'week' ? '주' : '일'}
          </button>
        ))}
      </div>
    </div>
  )
}
