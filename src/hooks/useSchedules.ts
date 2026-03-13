'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  fetchSchedules,
  fetchSchedulesByRange,
  createSchedule,
  updateSchedule,
  deleteSchedule,
  toggleScheduleDone,
} from '@/lib/firebase/firestore'
import { upcomingKeys } from '@/hooks/useUpcoming'
import type { ScheduleFormValues } from '@/types'

// ─── 쿼리 키 ────────────────────────────────────────────
export const scheduleKeys = {
  all: (userId: string) => ['schedules', userId] as const,
  range: (userId: string, start: Date, end: Date) =>
    ['schedules', userId, 'range', start.toISOString(), end.toISOString()] as const,
}

// ─── 전체 일정 조회 ──────────────────────────────────────
export function useSchedules(userId: string | null) {
  return useQuery({
    queryKey: userId ? scheduleKeys.all(userId) : ['schedules', 'empty'],
    queryFn: () => fetchSchedules(userId!),
    enabled: !!userId,
  })
}

// ─── 날짜 범위 일정 조회 ─────────────────────────────────
export function useSchedulesByRange(
  userId: string | null,
  startDate: Date,
  endDate: Date
) {
  return useQuery({
    queryKey: userId
      ? scheduleKeys.range(userId, startDate, endDate)
      : ['schedules', 'empty'],
    queryFn: () => fetchSchedulesByRange(userId!, startDate, endDate),
    enabled: !!userId,
  })
}

// ─── 공통: 일정 + 마감 임박 동시 무효화 ─────────────────
function invalidateAll(queryClient: ReturnType<typeof useQueryClient>, userId: string) {
  queryClient.invalidateQueries({ queryKey: scheduleKeys.all(userId) })
  queryClient.invalidateQueries({ queryKey: upcomingKeys.all(userId) })
}

// ─── 일정 생성 ───────────────────────────────────────────
export function useCreateSchedule(userId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (values: ScheduleFormValues) =>
      createSchedule(userId, values),
    onSuccess: () => invalidateAll(queryClient, userId),
  })
}

// ─── 일정 수정 ───────────────────────────────────────────
export function useUpdateSchedule(userId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      scheduleId,
      values,
    }: {
      scheduleId: string
      values: Partial<ScheduleFormValues>
    }) => updateSchedule(userId, scheduleId, values),
    onSuccess: () => invalidateAll(queryClient, userId),
  })
}

// ─── 일정 삭제 ───────────────────────────────────────────
export function useDeleteSchedule(userId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (scheduleId: string) => deleteSchedule(userId, scheduleId),
    onSuccess: () => invalidateAll(queryClient, userId),
  })
}

// ─── 완료 토글 ───────────────────────────────────────────
export function useToggleScheduleDone(userId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      scheduleId,
      isDone,
    }: {
      scheduleId: string
      isDone: boolean
    }) => toggleScheduleDone(userId, scheduleId, isDone),
    onSuccess: () => invalidateAll(queryClient, userId),
  })
}
