'use client'

import { useAuth } from '@/hooks/useAuth'
import { useUpcoming } from '@/hooks/useUpcoming'
import { UpcomingItem } from './UpcomingItem'
import { Clock } from 'lucide-react'

export function UpcomingPanel() {
  const { user } = useAuth()
  const { data: schedules, isLoading } = useUpcoming(user?.uid ?? null)

  return (
    <aside className="w-72 border-l border-border flex flex-col bg-background shrink-0">
      <div className="h-14 flex items-center px-5 border-b border-border">
        <Clock className="w-4 h-4 text-muted-foreground mr-2" />
        <span className="text-sm font-semibold text-foreground">마감 임박</span>
      </div>

      <div className="flex-1 overflow-y-auto">
        {isLoading && (
          <div className="flex items-center justify-center h-32">
            <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {!isLoading && (!schedules || schedules.length === 0) && (
          <div className="flex flex-col items-center justify-center h-32 text-center px-4">
            <p className="text-sm text-muted-foreground">
              다가오는 일정이 없어요
            </p>
          </div>
        )}

        {!isLoading && schedules && schedules.length > 0 && (
          <div className="p-3 space-y-2">
            {schedules.map((schedule) => (
              <UpcomingItem key={schedule.id} schedule={schedule} />
            ))}
          </div>
        )}
      </div>
    </aside>
  )
}
