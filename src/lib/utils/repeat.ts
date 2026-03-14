import {
  addDays,
  addWeeks,
  addMonths,
  addYears,
  isBefore,
  isAfter,
  startOfWeek,
  startOfMonth,
  endOfMonth,
} from 'date-fns'
import type { RepeatConfig, Schedule } from '@/types'
import { Timestamp } from 'firebase/firestore'

// Timestamp | Date 를 Date로 변환
function toDate(value: Timestamp | Date): Date {
  return value instanceof Date ? value : value.toDate()
}

/**
 * 반복 일정의 발생 날짜 목록을 계산합니다.
 * - weekly + daysOfWeek: 지정 요일마다 발생
 * - exceptions: 해당 날짜는 제외
 * - untilDate: 이 날짜 이후는 생성하지 않음 (expandForRange에서 rangeEnd로 전달)
 */
export function getRepeatDates(
  baseDate: Date,
  repeat: RepeatConfig,
  maxCount = 3650,
  untilDate?: Date
): Date[] {
  if (!repeat.enabled) return [baseDate]

  const exceptionSet = new Set(
    (repeat.exceptions ?? []).map((ts) => toDate(ts as Timestamp).toDateString())
  )

  // repeat.endDate와 untilDate 중 더 이른 것을 실질적 종료일로 사용
  const repeatEndDate = repeat.endDate ? toDate(repeat.endDate as Timestamp) : null
  const effectiveEnd =
    repeatEndDate && untilDate
      ? isBefore(repeatEndDate, untilDate) ? repeatEndDate : untilDate
      : repeatEndDate ?? untilDate ?? null

  // weekly + daysOfWeek 조합
  if (repeat.type === 'weekly' && repeat.daysOfWeek && repeat.daysOfWeek.length > 0) {
    return getWeeklyByDays(baseDate, repeat, exceptionSet, effectiveEnd, maxCount)
  }

  // 일반 반복
  const dates: Date[] = []
  let current = baseDate

  while (dates.length < maxCount) {
    if (effectiveEnd && isAfter(current, effectiveEnd)) break

    if (!exceptionSet.has(current.toDateString())) {
      dates.push(current)
    }

    if (repeat.endType === 'count' && dates.length >= (repeat.endCount ?? 1)) break

    let next: Date
    switch (repeat.type) {
      case 'daily':   next = addDays(current, repeat.interval);   break
      case 'weekly':  next = addWeeks(current, repeat.interval);  break
      case 'monthly': next = addMonths(current, repeat.interval); break
      case 'yearly':  next = addYears(current, repeat.interval);  break
      default:        next = addDays(current, repeat.interval)
    }

    current = next
  }

  return dates
}

/**
 * 주간 반복 + daysOfWeek 지원
 * baseDate가 속한 주부터 interval주마다 지정 요일에 날짜 생성
 */
function getWeeklyByDays(
  baseDate: Date,
  repeat: RepeatConfig,
  exceptionSet: Set<string>,
  effectiveEnd: Date | null,
  maxCount: number
): Date[] {
  const dates: Date[] = []
  const daysOfWeek = [...repeat.daysOfWeek!].sort((a, b) => a - b)
  const maxDate = effectiveEnd ?? addYears(baseDate, 2)

  let weekStart = startOfWeek(baseDate, { weekStartsOn: 0 })

  while (dates.length < maxCount && !isAfter(weekStart, maxDate)) {
    for (const dow of daysOfWeek) {
      const d = addDays(weekStart, dow)

      if (isBefore(d, baseDate)) continue
      if (isAfter(d, maxDate)) break
      if (exceptionSet.has(d.toDateString())) continue

      dates.push(d)

      if (repeat.endType === 'count' && dates.length >= (repeat.endCount ?? 1)) return dates
    }

    weekStart = addWeeks(weekStart, repeat.interval)
  }

  return dates
}

/**
 * MonthView / WeekView 등에서 사용.
 * schedules 배열을 받아 반복 일정을 주어진 범위 내에서 인스턴스로 펼쳐줍니다.
 *
 * 반복 인스턴스는 원본 Schedule을 복사하되:
 *   - id: `${원본id}__${timestamp}` (가상 ID)
 *   - startAt / endAt: 해당 인스턴스 날짜로 조정
 *   - _repeatSourceId: 원본 id (수정/삭제 시 사용)
 *   - _instanceDate: 이 인스턴스의 날짜
 */
export function expandForRange(
  schedules: Schedule[],
  rangeStart: Date,
  rangeEnd: Date
): Schedule[] {
  const result: Schedule[] = []

  for (const s of schedules) {
    // repeat 필드 자체가 없는 기존 일정 방어 (optional chaining)
    if (!s.repeat?.enabled) {
      result.push(s)
      continue
    }

    const baseDate = toDate(s.startAt as Timestamp)
    const duration =
      toDate(s.endAt as Timestamp).getTime() - baseDate.getTime()

    const dates = getRepeatDates(baseDate, s.repeat, 3650, rangeEnd)

    // 이미 추가된 타임스탬프 추적 (중복 방지)
    const addedTimestamps = new Set<number>()

    // baseDate가 rangeStart~rangeEnd 안에 있으면 반드시 첫 인스턴스로 포함
    if (!isBefore(baseDate, rangeStart) && !isAfter(baseDate, rangeEnd)) {
      const t = baseDate.getTime()
      addedTimestamps.add(t)
      const instanceEnd = new Date(t + duration)
      result.push({
        ...s,
        id: `${s.id}__${t}`,
        startAt: Timestamp.fromDate(baseDate),
        endAt:   Timestamp.fromDate(instanceEnd),
        _repeatSourceId: s.id,
        _instanceDate:   baseDate,
      } as Schedule & { _repeatSourceId: string; _instanceDate: Date })
    }

    for (const d of dates) {
      if (isAfter(d, rangeEnd)) break
      if (isBefore(d, rangeStart)) continue

      const t = d.getTime()
      if (addedTimestamps.has(t)) continue
      addedTimestamps.add(t)

      const instanceEnd = new Date(t + duration)
      result.push({
        ...s,
        id: `${s.id}__${t}`,
        startAt: Timestamp.fromDate(d),
        endAt:   Timestamp.fromDate(instanceEnd),
        // 커스텀 필드: 원본 ID와 인스턴스 날짜 보존
        _repeatSourceId: s.id,
        _instanceDate:   d,
      } as Schedule & { _repeatSourceId: string; _instanceDate: Date })
    }
  }

  return result
}

/**
 * 한 달 범위의 인스턴스 확장 (MonthView 전용 편의 함수)
 */
export function expandForMonth(schedules: Schedule[], monthDate: Date): Schedule[] {
  const start = startOfMonth(monthDate)
  const end   = endOfMonth(monthDate)
  return expandForRange(schedules, start, end)
}
