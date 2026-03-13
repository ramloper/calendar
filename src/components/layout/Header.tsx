'use client'

import { useAuth } from '@/hooks/useAuth'
import { ThemeToggle } from './ThemeToggle'
import { formatDate } from '@/lib/utils/date'
import { LogOut } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function Header() {
  const { user, signOut } = useAuth()

  return (
    <header className="h-14 border-b border-border flex items-center justify-between px-6 bg-background shrink-0">
      <div className="text-sm text-muted-foreground">
        {/*{formatDate(new Date(), 'yyyy년 M월 d일 EEEE')}*/}
      </div>

      <div className="flex items-center gap-2">
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
