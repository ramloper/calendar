import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  isToday,
  differenceInCalendarDays,
  addMonths,
  subMonths,
  addDays,
  addWeeks,
  subDays,
  subWeeks,
} from 'date-fns'
import { ko } from 'date-fns/locale'

export function formatDate(date: Date, pattern: string): string {
  return format(date, pattern, { locale: ko })
}

export function getMonthGrid(date: Date): Date[] {
  const start = startOfWeek(startOfMonth(date), { weekStartsOn: 0 })
  const end = endOfWeek(endOfMonth(date), { weekStartsOn: 0 })
  return eachDayOfInterval({ start, end })
}

export function getDaysInMonth(date: Date): Date[] {
  return eachDayOfInterval({
    start: startOfMonth(date),
    end: endOfMonth(date),
  })
}

export function getDDayLabel(date: Date): string {
  const diff = differenceInCalendarDays(date, new Date())
  if (diff === 0) return 'D-Day'
  if (diff < 0) return `D+${Math.abs(diff)}`
  return `D-${diff}`
}

export function getDDayNumber(date: Date): number {
  return differenceInCalendarDays(date, new Date())
}

// 해당 날짜가 속한 주의 일요일 ~ 토요일 7일 반환
export function getWeekDays(date: Date): Date[] {
  const start = startOfWeek(date, { weekStartsOn: 0 })
  return Array.from({ length: 7 }, (_, i) => addDays(start, i))
}

export { isSameMonth, isSameDay, isToday, addMonths, subMonths, addDays, addWeeks, subDays, subWeeks }
