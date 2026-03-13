import { addDays, addWeeks, addMonths, addYears, isBefore } from 'date-fns'
import type { RepeatConfig } from '@/types'
import { Timestamp } from 'firebase/firestore'

/**
 * 반복 일정의 다음 발생 날짜 목록을 계산합니다.
 * @param baseDate 원본 일정 시작일
 * @param repeat 반복 설정
 * @param maxCount 최대 생성 개수 (무한 루프 방지)
 */
export function getRepeatDates(
  baseDate: Date,
  repeat: RepeatConfig,
  maxCount = 50
): Date[] {
  if (!repeat.enabled) return [baseDate]

  const dates: Date[] = [baseDate]
  let current = baseDate
  const endDate = repeat.endDate
    ? (repeat.endDate as Timestamp).toDate()
    : null

  while (dates.length < maxCount) {
    let next: Date

    switch (repeat.type) {
      case 'daily':
        next = addDays(current, repeat.interval)
        break
      case 'weekly':
        next = addWeeks(current, repeat.interval)
        break
      case 'monthly':
        next = addMonths(current, repeat.interval)
        break
      case 'yearly':
        next = addYears(current, repeat.interval)
        break
      default:
        next = addDays(current, repeat.interval)
    }

    // 종료 조건 체크
    if (repeat.endType === 'date' && endDate && isBefore(endDate, next)) break
    if (repeat.endType === 'count' && dates.length >= (repeat.endCount ?? 1))
      break

    dates.push(next)
    current = next
  }

  return dates
}
