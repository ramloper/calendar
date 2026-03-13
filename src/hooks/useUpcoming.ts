'use client'

import { useQuery } from '@tanstack/react-query'
import { fetchUpcomingSchedules } from '@/lib/firebase/firestore'
import { getDDayNumber } from '@/lib/utils/date'
import { toDate } from '@/lib/utils/multiday'
import { startOfDay } from 'date-fns'
import type { Schedule } from '@/types'
import { Timestamp } from 'firebase/firestore'

export const upcomingKeys = {
  all: (userId: string) => ['upcoming', userId] as const,
}

export function useUpcoming(userId: string | null, limit = 10) {
  return useQuery({
    queryKey: userId ? upcomingKeys.all(userId) : ['upcoming', 'empty'],
    queryFn: () => fetchUpcomingSchedules(userId!, limit),
    enabled: !!userId,
    refetchInterval: 5 * 60 * 1000,
    select: (schedules: Schedule[]) => {
      const today = startOfDay(new Date())
      const in30Days = new Date()
      in30Days.setDate(in30Days.getDate() + 30)

      return schedules
        .filter((s) => {
          if (s.isDone) return false
          const end = toDate(s.endAt as Timestamp | Date | string)
          return end >= today && end <= in30Days
        })
        .sort((a, b) => {
          // 종료일 기준으로 정렬 (마감 임박 순)
          const aEnd = toDate(a.endAt as Timestamp | Date | string).getTime()
          const bEnd = toDate(b.endAt as Timestamp | Date | string).getTime()
          return aEnd - bEnd
        })
        .slice(0, limit)
    },
  })
}
