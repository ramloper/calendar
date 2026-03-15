import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  fetchTags,
  createTag,
  updateTag,
  deleteTag,
} from '@/lib/firebase/firestore'
import type { Tag } from '@/types'

const tagKeys = {
  all: (userId: string | null) => [userId, 'tags'],
  list: (userId: string | null) => [...tagKeys.all(userId), 'list'],
}

/**
 * 사용자의 모든 태그 조회
 */
export function useTags(userId: string | null) {
  return useQuery({
    queryKey: tagKeys.list(userId),
    queryFn: () => (userId ? fetchTags(userId) : Promise.resolve([])),
    enabled: !!userId,
    staleTime: 1000 * 60 * 5, // 5분
  })
}

/**
 * 태그 생성
 */
export function useCreateTag(userId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (tag: Omit<Tag, 'id' | 'createdAt'>) => createTag(userId, tag),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tagKeys.list(userId) })
    },
  })
}

/**
 * 태그 업데이트 (색상, 이모지, 이름 변경 등)
 */
export function useUpdateTag(userId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      tagId,
      updates,
    }: {
      tagId: string
      updates: Partial<Omit<Tag, 'id' | 'createdAt'>>
    }) => updateTag(userId, tagId, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tagKeys.list(userId) })
    },
  })
}

/**
 * 태그 삭제
 */
export function useDeleteTag(userId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (tagId: string) => deleteTag(userId, tagId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tagKeys.list(userId) })
    },
  })
}
