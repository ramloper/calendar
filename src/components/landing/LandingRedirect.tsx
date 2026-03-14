'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'

/**
 * 로그인 상태에 따라 리다이렉트하는 클라이언트 컴포넌트
 * - 로그인됨: /calendar로 이동
 * - 로딩중: 로딩 스피너
 * - 비로그인: children 렌더링
 */
export function LandingRedirect({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && user) {
      router.replace('/calendar')
    }
  }, [user, loading, router])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (user) return null

  return <>{children}</>
}
