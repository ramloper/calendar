import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from './useAuth'
import { fetchUserSettings, saveUserSettings } from '@/lib/firebase/firestore'
import type { UserSettings } from '@/types'

export function useUserSettings() {
  const { user } = useAuth()
  return useQuery({
    queryKey: ['userSettings', user?.uid],
    queryFn: () => fetchUserSettings(user!.uid),
    enabled: !!user,
    staleTime: 1000 * 60 * 5,
  })
}

export function useSaveUserSettings() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (settings: Partial<UserSettings>) =>
      saveUserSettings(user!.uid, settings),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userSettings', user?.uid] })
    },
  })
}
