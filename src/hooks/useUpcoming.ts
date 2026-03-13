'use client'

import { useQuery } from '@tanstack/react-query'
import { fetchUpcomingSchedules } from '@/lib/firebase/firestore'
import { getDDayNumber } from '@/lib/utils/date'
import type { Schedule } from '@/types'

export const upcomingKeys = {
  all: (userId: string) => ['upcoming', userId] as const,
}

export function useUpcoming(userId: string | null, limit = 10) {
  return useQuery({
    queryKey: userId ? upcomingKeys.all(userId) : ['upcoming', 'empty'],
    queryFn: () => fetchUpcomingSchedules(userId!, limit),
    enabled: !!userId,
    // 5분마다 자동 갱신
    refetchInterval: 5 * 60 * 1000,
    select: (schedules: Schedule[]) => {
      const in30Days = new Date()
      in30Days.setDate(in30Days.getDate() + 30)

      return schedules
        .filter((s) => !s.isDone && s.startAt.toDate() <= in30Days)
        .sort((a, b) => {
          const aDay = getDDayNumber(a.startAt.toDate())
          const bDay = getDDayNumber(b.startAt.toDate())
          return aDay - bDay
        })
    },
  })
}
