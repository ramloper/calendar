import { create } from 'zustand'
import { addMonths, subMonths, addWeeks, subWeeks, addDays, subDays } from '@/lib/utils/date'
import type { CalendarView } from '@/types'

interface CalendarState {
  currentDate: Date
  view: CalendarView
  selectedDate: Date | null

  setCurrentDate: (date: Date) => void
  setView: (view: CalendarView) => void
  setSelectedDate: (date: Date | null) => void
  goPrev: () => void
  goNext: () => void
  goToToday: () => void
}

export const useCalendarStore = create<CalendarState>((set) => ({
  currentDate: new Date(),
  view: 'month',
  selectedDate: new Date(),

  setCurrentDate: (date) => set({ currentDate: date }),
  setView: (view) => set({ view }),
  setSelectedDate: (date) => set({ selectedDate: date }),

  goPrev: () =>
    set((state) => ({
      currentDate:
        state.view === 'month' ? subMonths(state.currentDate, 1)
        : state.view === 'week' ? subWeeks(state.currentDate, 1)
        : subDays(state.currentDate, 1),
    })),

  goNext: () =>
    set((state) => ({
      currentDate:
        state.view === 'month' ? addMonths(state.currentDate, 1)
        : state.view === 'week' ? addWeeks(state.currentDate, 1)
        : addDays(state.currentDate, 1),
    })),

  goToToday: () => set({ currentDate: new Date(), selectedDate: new Date() }),
}))
