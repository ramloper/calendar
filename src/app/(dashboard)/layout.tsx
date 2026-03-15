'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { Sidebar } from '@/components/layout/Sidebar'
import { Header } from '@/components/layout/Header'
import { DayDetailPanel } from '@/components/day/DayDetailPanel'
import { ScheduleModal } from '@/components/schedule/ScheduleModal'
import { SettingsModal } from '@/components/settings/SettingsModal'
import { BottomNavigation } from '@/components/layout/BottomNavigation'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login')
    }
  }, [user, loading, router])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!user) return null

  return (
    <>
      {/* 데스크톱 레이아웃 (md 이상) */}
      <div className="hidden md:flex h-screen bg-muted/30 overflow-hidden justify-center">
        {/* 1920px 캡 — 이 안에서 사이드바/메인/패널이 꽉 채움 */}
        <div className="flex w-full max-w-[1920px] h-full bg-background">
          {/* 좌측 사이드바 */}
          <Sidebar />

          {/* 메인 콘텐츠 */}
          <div className="flex flex-col flex-1 min-w-0">
            <Header />
            <main className="flex-1 overflow-auto">{children}</main>
          </div>

          {/* 우측 날짜 상세 패널 */}
          <DayDetailPanel />
        </div>
      </div>

      {/* 모바일 레이아웃 (md 미만) */}
      <div className="md:hidden flex flex-col h-screen bg-background pb-16">
        <Header />
        <main className="flex-1 overflow-auto">{children}</main>
        <BottomNavigation />
      </div>

      {/* 전역 모달들 */}
      <ScheduleModal />
      <SettingsModal />
    </>
  )
}
