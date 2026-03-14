'use client'

import { useAuth } from '@/hooks/useAuth'
import { useUiStore } from '@/stores/uiStore'
import { ThemeToggle } from './ThemeToggle'
import { formatDate } from '@/lib/utils/date'
import { LogOut, Menu } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function Header() {
  const { user, signOut } = useAuth()
  const { toggleSidebar } = useUiStore()

  return (
    <header className="h-14 border-b border-border flex items-center justify-between px-6 bg-background shrink-0">
      {/* 모바일 햄버거 메뉴 */}
      <Button
        variant="ghost"
        size="icon"
        onClick={toggleSidebar}
        className="md:hidden w-9 h-9"
      >
        <Menu className="h-5 w-5" />
      </Button>

      <div className="text-sm text-muted-foreground hidden md:block">
        {/*{formatDate(new Date(), 'yyyy년 M월 d일 EEEE')}*/}
      </div>

      <div className="flex items-center gap-2 md:ml-auto">
        <ThemeToggle />
        {user?.photoURL && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={user.photoURL}
            alt={user.displayName ?? ''}
            className="w-7 h-7 rounded-full"
          />
        )}
        <Button variant="ghost" size="icon" onClick={signOut} className="w-9 h-9">
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
    </header>
  )
}
