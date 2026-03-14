'use client'

import { CalendarDays, ListTodo, Clock, Settings } from 'lucide-react'
import { useUiStore } from '@/stores/uiStore'
import { cn } from '@/lib/utils'

type TabKey = 'calendar' | 'schedule' | 'upcoming' | 'settings'

interface Tab {
  key: TabKey
  label: string
  icon: React.ReactNode
}

const TABS: Tab[] = [
  { key: 'calendar', label: '캘린더', icon: <CalendarDays className="w-5 h-5" /> },
  { key: 'schedule', label: '일정', icon: <ListTodo className="w-5 h-5" /> },
  { key: 'upcoming', label: '마감', icon: <Clock className="w-5 h-5" /> },
  { key: 'settings', label: '설정', icon: <Settings className="w-5 h-5" /> },
]

export function BottomNavigation() {
  const { activeBottomTab, setActiveBottomTab, openSettingsModal } = useUiStore()

  const handleTabClick = (tab: TabKey) => {
    setActiveBottomTab(tab)

    // 설정 탭 클릭 시 모달 열기
    if (tab === 'settings') {
      openSettingsModal()
    }
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 h-16 bg-background border-t border-border flex items-center justify-around px-4 md:hidden z-40">
      {TABS.map((tab) => (
        <button
          key={tab.key}
          onClick={() => handleTabClick(tab.key)}
          className={cn(
            'flex flex-col items-center justify-center gap-1 w-16 h-16 rounded-lg transition-colors',
            activeBottomTab === tab.key
              ? 'text-primary bg-primary/10'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          {tab.icon}
          <span className="text-xs font-medium">{tab.label}</span>
        </button>
      ))}
    </nav>
  )
}
