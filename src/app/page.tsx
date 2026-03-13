'use client'

import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { useEffect } from 'react'
import Link from 'next/link'

const FEATURES = [
  {
    emoji: '🗓️',
    title: '직관적인 캘린더',
    desc: '월간·주간·일간 보기로 일정을 한눈에 파악하세요. 드래그 앤 드롭으로 일정을 손쉽게 이동할 수 있어요.',
  },
  {
    emoji: '🔔',
    title: '스마트 알림',
    desc: '이메일·문자로 마감 전 미리 알림을 받으세요. 10분 전부터 한 달 전까지 원하는 시간에 설정할 수 있어요.',
  },
  {
    emoji: '⚡',
    title: 'D-Day 마감 관리',
    desc: '곧 다가오는 일정을 사이드바에서 바로 확인하세요. D-Day 카운트다운으로 중요한 순간을 절대 놓치지 않아요.',
  },
]

// Mock calendar data for the decorative preview
const CALENDAR_WEEKS = [
  [null, null, null, null, null, null, 1],
  [2, 3, 4, 5, 6, 7, 8],
  [9, 10, 11, 12, 13, 14, 15],
  [16, 17, 18, 19, 20, 21, 22],
  [23, 24, 25, 26, 27, 28, 29],
  [30, 31, null, null, null, null, null],
]

const MOCK_EVENTS: Record<number, { label: string; color: string }[]> = {
  10: [{ label: '팀 미팅', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' }],
  11: [{ label: '팀 미팅', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' }],
  12: [{ label: '팀 미팅', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' }],
  17: [{ label: '프로젝트 마감', color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300' }],
  20: [{ label: '생일 파티 🎂', color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300' }],
  24: [{ label: '발표 준비', color: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300' }],
  28: [{ label: '월말 결산', color: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300' }],
}

export default function LandingPage() {
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

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* ── Sticky Header ── */}
      <header className="fixed top-0 inset-x-0 z-50 h-16 border-b border-border/50 bg-background/75 backdrop-blur-xl">
        <div className="max-w-5xl mx-auto h-full px-6 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center shadow-sm">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <rect x="1" y="5" width="14" height="10" rx="1.5" fill="white" fillOpacity="0.95"/>
                <rect x="1" y="5" width="14" height="4.5" rx="1.5" fill="white" fillOpacity="0.35"/>
                <rect x="4.5" y="2.5" width="2" height="5" rx="1" fill="white"/>
                <rect x="9.5" y="2.5" width="2" height="5" rx="1" fill="white"/>
              </svg>
            </div>
            <span className="text-sm font-semibold text-foreground">캘린더</span>
          </div>
          {/* CTA */}
          <Link href="/login">
            <button className="h-9 px-5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-all active:scale-95 shadow-sm">
              시작하기
            </button>
          </Link>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="pt-36 pb-16 px-6">
        <div className="max-w-3xl mx-auto text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border border-primary/25 bg-primary/8 text-primary text-xs font-semibold mb-7 select-none">
            <span>✨</span>
            <span>나만의 스마트 일정 관리</span>
          </div>

          {/* Headline */}
          <h1 className="text-[3.25rem] leading-[1.15] font-extrabold tracking-tight text-foreground mb-5">
            복잡한 일정을<br />
            <span className="text-primary">심플하게</span> 관리하세요
          </h1>

          {/* Subtitle */}
          <p className="text-lg text-muted-foreground max-w-xl mx-auto leading-relaxed mb-10">
            반복 일정, 마감 알림, 드래그 앤 드롭까지 — 일정 관리에 필요한 모든 것을 하나로.
          </p>

          {/* CTAs */}
          <div className="flex items-center justify-center gap-3">
            <Link href="/login">
              <button className="h-12 px-8 rounded-2xl bg-primary text-primary-foreground text-base font-semibold hover:bg-primary/90 transition-all active:scale-95 shadow-lg shadow-primary/20">
                Google로 무료 시작
              </button>
            </Link>
          </div>
        </div>
      </section>

      {/* ── Calendar Preview ── */}
      <section className="px-6 pb-20">
        <div className="max-w-3xl mx-auto">
          <div className="rounded-2xl border border-border bg-card shadow-2xl shadow-black/5 overflow-hidden">
            {/* Window bar */}
            <div className="flex items-center gap-2 px-5 py-3.5 border-b border-border bg-muted/40">
              <div className="w-3 h-3 rounded-full bg-[#FF5F57]" />
              <div className="w-3 h-3 rounded-full bg-[#FFBD2E]" />
              <div className="w-3 h-3 rounded-full bg-[#28CA41]" />
              <div className="flex-1" />
              <span className="text-xs font-medium text-muted-foreground">2026년 3월</span>
              <div className="flex-1" />
            </div>

            {/* Calendar Grid */}
            <div className="p-5 bg-background">
              {/* Days header */}
              <div className="grid grid-cols-7 mb-1">
                {['일', '월', '화', '수', '목', '금', '토'].map((d, i) => (
                  <div
                    key={d}
                    className={`text-center text-[11px] font-semibold py-2 ${
                      i === 0 ? 'text-red-500' : i === 6 ? 'text-blue-500' : 'text-muted-foreground'
                    }`}
                  >
                    {d}
                  </div>
                ))}
              </div>

              {/* Weeks */}
              {CALENDAR_WEEKS.map((week, wi) => (
                <div key={wi} className="grid grid-cols-7">
                  {week.map((day, di) => (
                    <div
                      key={di}
                      className="relative min-h-[58px] border-t border-border/40 p-1.5"
                    >
                      {day !== null && (
                        <>
                          <span
                            className={`
                              text-xs font-medium inline-flex items-center justify-center
                              ${day === 13
                                ? 'w-5 h-5 rounded-full bg-primary text-primary-foreground'
                                : di === 0
                                ? 'text-red-500'
                                : di === 6
                                ? 'text-blue-500'
                                : 'text-foreground'
                              }
                            `}
                          >
                            {day}
                          </span>
                          {MOCK_EVENTS[day]?.map((ev, ei) => (
                            <div
                              key={ei}
                              className={`mt-0.5 text-[9px] font-medium rounded px-1 py-0.5 truncate leading-tight ${ev.color}`}
                            >
                              {ev.label}
                            </div>
                          ))}
                        </>
                      )}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section className="px-6 pb-24">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-foreground mb-3">
              필요한 것만, 딱 맞게
            </h2>
            <p className="text-muted-foreground">
              복잡한 기능 없이 충분히 스마트한 일정 관리를 경험하세요
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-5">
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className="p-6 rounded-2xl border border-border bg-card hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 transition-all duration-200"
              >
                <div className="text-3xl mb-4">{f.emoji}</div>
                <h3 className="text-sm font-semibold text-foreground mb-2">{f.title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Bottom CTA ── */}
      <section className="px-6 pb-28">
        <div className="max-w-2xl mx-auto">
          <div className="rounded-3xl bg-primary/6 border border-primary/15 px-8 py-14 text-center">
            <div className="text-4xl mb-5">🗓️</div>
            <h2 className="text-2xl font-bold text-foreground mb-3">지금 바로 시작하세요</h2>
            <p className="text-sm text-muted-foreground mb-8">
              Google 계정으로 10초만에 시작할 수 있어요. 무료입니다.
            </p>
            <Link href="/login">
              <button className="inline-flex items-center gap-2.5 h-12 px-8 rounded-2xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-all active:scale-95 shadow-lg shadow-primary/25">
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="currentColor" fillOpacity="0.85"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="currentColor" fillOpacity="0.85"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="currentColor" fillOpacity="0.85"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="currentColor" fillOpacity="0.85"/>
                </svg>
                Google로 무료 시작
              </button>
            </Link>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-border/60 px-6 py-8">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-primary/10 flex items-center justify-center">
              <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                <rect x="1" y="5" width="14" height="10" rx="1.5" fill="currentColor" className="text-primary"/>
                <rect x="4.5" y="2.5" width="2" height="5" rx="1" fill="currentColor" className="text-primary"/>
                <rect x="9.5" y="2.5" width="2" height="5" rx="1" fill="currentColor" className="text-primary"/>
              </svg>
            </div>
            <span className="text-sm font-medium text-muted-foreground">캘린더</span>
          </div>
          <span className="text-xs text-muted-foreground">나만의 일정 관리 앱</span>
        </div>
      </footer>
    </div>
  )
}
