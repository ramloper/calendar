import type { Metadata } from 'next'
import { ThemeProvider } from 'next-themes'
import { QueryProvider } from '@/components/ui/QueryProvider'
import './globals.css'

export const metadata: Metadata = {
  title: {
    default: '캘린더 - 나만의 일정 관리 앱',
    template: '%s | 캘린더',
  },
  description: '복잡한 일정을 심플하게 관리하세요. 반복 일정, 마감 알림, 드래그 앤 드롭까지 — 일정 관리에 필요한 모든 것을 하나로.',
  metadataBase: new URL('https://calendar.example.com'),
  viewport: 'width=device-width, initial-scale=1',
  charset: 'utf-8',
  alternates: {
    canonical: 'https://calendar.example.com',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <body className="antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <QueryProvider>{children}</QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
