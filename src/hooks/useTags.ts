'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchTags, createTag, deleteTag } from '@/lib/firebase/firestore'
import type { Tag } from '@/types'

export const tagKeys = {
  all: (userId: string) => ['tags', userId] as const,
}

export function useTags(userId: string | null) {
  return useQuery({
    queryKey: userId ? tagKeys.all(userId) : ['tags', 'empty'],
    queryFn: () => fetchTags(userId!),
    enabled: !!userId,
  })
}

export function useCreateTag(userId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (tag: Omit<Tag, 'id' | 'createdAt'>) => createTag(userId, tag),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tagKeys.all(userId) })
    },
  })
}

export function useDeleteTag(userId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (tagId: string) => deleteTag(userId, tagId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tagKeys.all(userId) })
    },
  })
}
