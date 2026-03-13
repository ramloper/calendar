'use client'

import { useCalendarStore } from '@/stores/calendarStore'
import { CalendarHeader } from './CalendarHeader'
import { MonthView } from './MonthView'
import { WeekView } from './WeekView'
import { DayView } from './DayView'

export function CalendarView() {
  const { view } = useCalendarStore()

  return (
    <div className="flex flex-col h-full p-6 gap-4">
      <CalendarHeader />
      {view === 'month' && <MonthView />}
      {view === 'week' && <WeekView />}
      {view === 'day' && <DayView />}
    </div>
  )
}
