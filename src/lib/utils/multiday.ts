import { startOfDay, endOfDay, differenceInCalendarDays, isBefore, isAfter } from 'date-fns'
import { Timestamp } from 'firebase/firestore'
import type { Schedule } from '@/types'

// ─── 타입 변환 ────────────────────────────────────────────

export function toDate(val: Timestamp | Date | string): Date {
  if (val instanceof Timestamp) return val.toDate()
  if (val instanceof Date) return val
  return new Date(val)
}

// ─── 멀티데이 판단 ─────────────────────────────────────────

/**
 * 이벤트가 멀티데이인지 판단:
 * - isAllDay=true 이거나
 * - startAt과 endAt이 다른 날짜인 경우
 */
export function isMultiDay(schedule: Schedule): boolean {
  if (schedule.isAllDay) return true
  const start = startOfDay(toDate(schedule.startAt))
  const end = startOfDay(toDate(schedule.endAt))
  return differenceInCalendarDays(end, start) >= 1
}

// ─── 이벤트 레이아웃 ───────────────────────────────────────

export interface EventLayout {
  schedule: Schedule
  colStart: number  // 0~6 (주 안에서 시작 열)
  colSpan: number   // 1~7 (가로 폭)
  slot: number      // 스택 행 번호 (겹치지 않게 배치)
  isStart: boolean  // 이 주에서 이벤트가 시작하는가 (왼쪽 둥글게)
  isEnd: boolean    // 이 주에서 이벤트가 끝나는가 (오른쪽 둥글게)
}

/**
 * 주어진 주(weekDays: 7일)에 대해, 멀티데이 이벤트들의 레이아웃을 계산합니다.
 * 슬롯 배치 알고리즘으로 겹치지 않게 row 번호를 부여합니다.
 */
export function computeWeekLayout(weekDays: Date[], schedules: Schedule[]): EventLayout[] {
  const weekStart = startOfDay(weekDays[0])
  const weekEnd = endOfDay(weekDays[6])

  // 이 주와 겹치는 멀티데이 이벤트만 추출
  const multiDayInWeek = schedules.filter((s) => {
    if (!isMultiDay(s)) return false
    const start = startOfDay(toDate(s.startAt))
    const end = startOfDay(toDate(s.endAt))
    // 겹치는 조건: 이벤트 시작 <= 주 끝 AND 이벤트 끝 >= 주 시작
    return !isAfter(start, weekEnd) && !isBefore(end, weekStart)
  })

  // 정렬: 시작일 오름차순, 같으면 기간 긴 것 먼저
  multiDayInWeek.sort((a, b) => {
    const aStart = toDate(a.startAt).getTime()
    const bStart = toDate(b.startAt).getTime()
    if (aStart !== bStart) return aStart - bStart
    const aDur = differenceInCalendarDays(toDate(a.endAt), toDate(a.startAt))
    const bDur = differenceInCalendarDays(toDate(b.endAt), toDate(b.startAt))
    return bDur - aDur
  })

  // 슬롯 배치: 각 슬롯에 [colStart, colEnd] 범위 기록
  const slotRanges: Array<Array<[number, number]>> = []
  const layouts: EventLayout[] = []

  for (const s of multiDayInWeek) {
    const eventStart = startOfDay(toDate(s.startAt))
    const eventEnd = startOfDay(toDate(s.endAt))

    // 이 주 안으로 클램프
    const clampedStart = isBefore(eventStart, weekStart) ? weekStart : eventStart
    const clampedEnd = isAfter(eventEnd, weekDays[6]) ? weekDays[6] : eventEnd

    const colStart = differenceInCalendarDays(clampedStart, weekStart)
    const colEnd = differenceInCalendarDays(clampedEnd, weekStart)
    const colSpan = colEnd - colStart + 1

    // 가장 낮은 빈 슬롯 찾기
    let slot = 0
    while (true) {
      if (!slotRanges[slot]) {
        slotRanges[slot] = []
        break
      }
      const conflicts = slotRanges[slot].some(([s, e]) => colStart <= e && colEnd >= s)
      if (!conflicts) break
      slot++
    }
    slotRanges[slot].push([colStart, colEnd])

    layouts.push({
      schedule: s,
      colStart,
      colSpan,
      slot,
      isStart: !isBefore(eventStart, weekStart),
      isEnd: !isAfter(eventEnd, weekDays[6]),
    })
  }

  return layouts
}

/**
 * 주어진 레이아웃에서 최대 슬롯 수 반환 (셀 높이 계산에 사용)
 */
export function maxSlots(layouts: EventLayout[]): number {
  if (layouts.length === 0) return 0
  return Math.max(...layouts.map((l) => l.slot)) + 1
}
