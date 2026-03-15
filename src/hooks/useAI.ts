/**
 * Hook for AI-powered schedule formatting
 * Handles loading states, errors, and API calls
 */

import { useState } from 'react'
import { formatScheduleDescription, type FormatDescriptionInput } from '@/lib/ai'
import { useUserSettings } from './useUserSettings'

export interface UseAIFormatting {
  isLoading: boolean
  error: string | null
  formattedDescription: string | null
  formatDescription: (input: Omit<FormatDescriptionInput, 'apiKey'>) => Promise<void>
  reset: () => void
}

export function useAIFormatting(): UseAIFormatting {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formattedDescription, setFormattedDescription] = useState<string | null>(null)
  const { data: settings } = useUserSettings()

  const formatDescription = async (input: Omit<FormatDescriptionInput, 'apiKey'>) => {
    setIsLoading(true)
    setError(null)
    setFormattedDescription(null)

    try {
      const apiKey = settings?.claudeApiKey
      if (!apiKey) {
        throw new Error('Claude API 키가 설정되지 않았습니다. 설정 > AI 설정에서 API 키를 입력해주세요.')
      }

      const result = await formatScheduleDescription({
        ...input,
        apiKey,
      })
      setFormattedDescription(result.formatted)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'AI 정리 실패'
      setError(errorMessage)
      console.error('AI formatting error:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const reset = () => {
    setIsLoading(false)
    setError(null)
    setFormattedDescription(null)
  }

  return {
    isLoading,
    error,
    formattedDescription,
    formatDescription,
    reset,
  }
}
