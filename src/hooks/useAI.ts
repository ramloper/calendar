/**
 * Hook for AI-powered schedule formatting
 * Handles loading states, errors, and API calls to backend
 */

import { useState } from 'react'
import { useUserSettings } from './useUserSettings'

export interface UseAIFormatting {
  isLoading: boolean
  error: string | null
  formattedDescription: string | null
  formatDescription: (input: { title: string; currentDescription: string }) => Promise<void>
  reset: () => void
}

export function useAIFormatting(): UseAIFormatting {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formattedDescription, setFormattedDescription] = useState<string | null>(null)
  const { data: settings } = useUserSettings()

  const formatDescription = async (input: { title: string; currentDescription: string }) => {
    setIsLoading(true)
    setError(null)
    setFormattedDescription(null)

    try {
      const apiKey = settings?.claudeApiKey
      if (!apiKey) {
        throw new Error('Claude API 키가 설정되지 않았습니다. 설정 > AI 설정에서 API 키를 입력해주세요.')
      }

      // 백엔드 API 엔드포인트에 요청
      const response = await fetch('/api/ai/format-description', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: input.title,
          description: input.currentDescription,
          apiKey,
        }),
      })

      if (!response.ok) {
        let errorMessage = 'AI 정리 실패'
        try {
          const errorData = await response.json()
          errorMessage = errorData.error || errorMessage
        } catch {
          // 응답이 JSON이 아닐 수 있음 (HTML 에러 페이지 등)
          errorMessage = `서버 오류: ${response.status} ${response.statusText}`
        }
        throw new Error(errorMessage)
      }

      const result = await response.json()
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
