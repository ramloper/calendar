'use client'

import { useEffect, useMemo, useRef, useCallback, useState } from 'react'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  pointerWithin,
  useSensor,
  useSensors,
  useDroppable,
  useDraggable,
  type DragStartEvent,
  type DragEndEvent,
} from '@dnd-kit/core'
import { snapCenterToCursor } from '@dnd-kit/modifiers'
import { addDays, differenceInCalendarDays, startOfDay } from 'date-fns'
import { Timestamp } from 'firebase/firestore'

import { useAuth } from '@/hooks/useAuth'
import { useSchedules, useUpdateSchedule } from '@/hooks/useSchedules'
import { useCalendarStore } from '@/stores/calendarStore'
import { useUiStore } from '@/stores/uiStore'
import { getWeekDays, isSameDay, isToday, formatDate } from '@/lib/utils/date'
import { computeWeekLayout, maxSlots, isMultiDay, toDate, type EventLayout } from '@/lib/utils/multiday'
import { cn } from '@/lib/utils'
import type { Schedule } from '@/types'

// ─── 상수 ─────────────────────────────────────────────────

const HOUR_HEIGHT = 64
const HOURS = Array.from({ length: 24 }, (_, i) => i)
const DAYS = ['일', '월', '화', '수', '목', '금', '토']
const SLOT_HEIGHT = 22
const SLOT_GAP = 2

// ─── 날짜 키 헬퍼 ─────────────────────────────────────────

function dateKey(date: Date): string {
  return `week-${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`
}

function timeKey(date: Date, hour: number): string {
  return `time-${date.getFullYear()}-${date.getMonth()}-${date.getDate()}-${hour}`
}

// ─── 이벤트 위치 계산 ──────────────────────────────────────

function getEventPosition(startAt: Date, endAt: Date) {
  const startMin = startAt.getHours() * 60 + startAt.getMinutes()
  const endMin = endAt.getHours() * 60 + endAt.getMinutes()
  const duration = Math.max(endMin - startMin, 30)
  return {
    top: (startMin / 60) * HOUR_HEIGHT,
    height: (duration / 60) * HOUR_HEIGHT,
  }
}

// ─── 드래그 오버레이 미리보기 ─────────────────────────────

function DragPreview({ schedule }: { schedule: Schedule }) {
  return (
    <div
      className="px-2 py-1 rounded-md text-xs font-medium shadow-lg pointer-events-none opacity-90"
      style={{
        backgroundColor: schedule.color + '40',
        color: schedule.color,
        border: `1px solid ${schedule.color}70`,
      }}
    >
      {schedule.title}
    </div>
  )
}

// ─── 멀티데이 바 (WeekView 종일 행용) ─────────────────────

function MultiDayBar({
  layout,
  onEdit,
}: {
  layout: EventLayout
  onEdit: (id: string) => void
}) {
  const { schedule, colStart, colSpan, slot, isStart, isEnd } = layout
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `allday-${schedule.id}`,
    data: { schedule, type: 'multiday' },
  })

  const topPx = slot * (SLOT_HEIGHT + SLOT_GAP) + 4
  const leftPct = (colStart / 7) * 100
  const widthPct = (colSpan / 7) * 100

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      onClick={(e) => { e.stopPropagation(); onEdit(schedule.id) }}
      className={cn(
        'absolute h-[22px] flex items-center px-2 text-xs font-medium cursor-grab select-none',
        'hover:opacity-80 transition-opacity z-10',
        isDragging && 'opacity-30',
        isStart ? 'rounded-l-md' : 'rounded-l-none',
        isEnd ? 'rounded-r-md' : 'rounded-r-none',
        schedule.isDone && 'opacity-50',
      )}
      style={{
        top: topPx,
        left: `calc(${leftPct}% + ${isStart ? 2 : 0}px)`,
        width: `calc(${widthPct}% - ${(isStart ? 2 : 0) + (isEnd ? 4 : 0)}px)`,
        backgroundColor: schedule.color + '30',
        color: schedule.color,
        border: `1px solid ${schedule.color}50`,
        borderLeft: !isStart ? 'none' : undefined,
        borderRight: !isEnd ? 'none' : undefined,
      }}
    >
      {isStart && (
        <span className={cn('truncate', schedule.isDone && 'line-through')}>
          {schedule.title}
        </span>
      )}
    </div>
  )
}

// ─── 드롭 가능 시간 셀 ────────────────────────────────────

function DroppableTimeSlot({
  id,
  children,
  className,
  style,
  onClick,
}: {
  id: string
  children?: React.ReactNode
  className?: string
  style?: React.CSSProperties
  onClick?: () => void
}) {
  const { setNodeRef, isOver } = useDroppable({ id })
  return (
    <div
      ref={setNodeRef}
      onClick={onClick}
      className={cn(className, isOver && 'bg-primary/10')}
      style={style}
    >
      {children}
    </div>
  )
}

// ─── WeekView ─────────────────────────────────────────────

export function WeekView() {
  const { user } = useAuth()
  const { currentDate, selectedDate, setSelectedDate } = useCalendarStore()
  const { openEditModal, openCreateModal } = useUiStore()
  const { data: schedules } = useSchedules(user?.uid ?? null)
  const updateSchedule = useUpdateSchedule(user?.uid ?? '')
  const scrollRef = useRef<HTMLDivElement>(null)
  const [draggingSchedule, setDraggingSchedule] = useState<Schedule | null>(null)

  const weekDays = getWeekDays(currentDate)

  // 현재 시각으로 스크롤
  useEffect(() => {
    if (scrollRef.current) {
      const now = new Date()
      const scrollTop = (now.getHours() - 1) * HOUR_HEIGHT
      scrollRef.current.scrollTop = Math.max(0, scrollTop)
    }
  }, [])

  // 멀티데이 이벤트 레이아웃 (종일 행)
  const allDayLayouts = useMemo(
    () => computeWeekLayout(weekDays, schedules ?? []),
    [weekDays, schedules]
  )
  const allDaySlotCount = useMemo(() => maxSlots(allDayLayouts), [allDayLayouts])
  const allDayRowHeight = allDaySlotCount > 0
    ? allDaySlotCount * (SLOT_HEIGHT + SLOT_GAP) + 12
    : 36

  // 시간대 일정 (멀티데이 아닌 것만)
  const getTimedSchedules = (date: Date): Schedule[] => {
    if (!schedules) return []
    return schedules.filter((s) => {
      if (isMultiDay(s)) return false
      return isSameDay(toDate(s.startAt as Timestamp | Date | string), date)
    })
  }

  const now = new Date()
  const currentTimeTop = (now.getHours() * 60 + now.getMinutes()) / 60 * HOUR_HEIGHT

  // ─── DnD 핸들러 ────────────────────────────────────────

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  )

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const s = event.active.data.current?.schedule as Schedule | undefined
    if (s) setDraggingSchedule(s)
  }, [])

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    setDraggingSchedule(null)
    const { active, over } = event
    if (!over || !user) return

    const schedule = active.data.current?.schedule as Schedule | undefined
    if (!schedule) return

    const overId = over.id as string

    // time-YYYY-M-D-H 형식 파싱
    if (overId.startsWith('time-')) {
      const parts = overId.replace('time-', '').split('-')
      const [year, month, day, hour] = parts.map(Number)
      const targetDate = new Date(year, month, day, hour, 0)
      const originalStart = toDate(schedule.startAt as Timestamp | Date | string)
      const durationMs = toDate(schedule.endAt as Timestamp | Date | string).getTime() - originalStart.getTime()
      const newStart = targetDate
      const newEnd = new Date(targetDate.getTime() + durationMs)
      updateSchedule.mutate({ scheduleId: schedule.id, values: { startAt: newStart, endAt: newEnd } })
    }

    // week-YYYY-M-D 형식 파싱 (종일 행 드래그)
    if (overId.startsWith('week-')) {
      const parts = overId.replace('week-', '').split('-')
      const [year, month, day] = parts.map(Number)
      const targetDate = new Date(year, month, day)
      const originalStart = startOfDay(toDate(schedule.startAt as Timestamp | Date | string))
      const deltaDays = differenceInCalendarDays(targetDate, originalStart)
      if (deltaDays === 0) return
      const newStart = addDays(toDate(schedule.startAt as Timestamp | Date | string), deltaDays)
      const newEnd = addDays(toDate(schedule.endAt as Timestamp | Date | string), deltaDays)
      updateSchedule.mutate({ scheduleId: schedule.id, values: { startAt: newStart, endAt: newEnd } })
    }
  }, [user, updateSchedule])

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={pointerWithin}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex-1 flex flex-col min-h-0 rounded-2xl border border-border overflow-hidden">

        {/* 헤더 행: 빈 칸 + 7일 */}
        <div
          className="grid border-b border-border bg-muted/30 shrink-0"
          style={{ gridTemplateColumns: '56px repeat(7, 1fr)' }}
        >
          <div className="border-r border-border" />
          {weekDays.map((date, idx) => {
            const isTodayDate = isToday(date)
            const isSelected = selectedDate ? isSameDay(date, selectedDate) : false
            const dayOfWeek = date.getDay()
            return (
              <div
                key={idx}
                onClick={() => setSelectedDate(date)}
                className={cn(
                  'py-3 text-center cursor-pointer border-r border-border last:border-r-0 hover:bg-accent/50 transition-colors',
                  isSelected && 'bg-primary/5',
                )}
              >
                <div className={cn(
                  'text-xs font-medium mb-1',
                  dayOfWeek === 0 && 'text-red-500',
                  dayOfWeek === 6 && 'text-blue-500',
                  dayOfWeek !== 0 && dayOfWeek !== 6 && 'text-muted-foreground',
                )}>
                  {DAYS[dayOfWeek]}
                </div>
                <div className={cn(
                  'w-8 h-8 mx-auto flex items-center justify-center rounded-full text-sm font-medium',
                  isTodayDate && 'bg-primary text-primary-foreground',
                  !isTodayDate && 'text-foreground',
                )}>
                  {date.getDate()}
                </div>
              </div>
            )
          })}
        </div>

        {/* 종일 행 — 멀티데이 바 */}
        <div
          className="grid border-b border-border bg-muted/10 shrink-0 relative"
          style={{
            gridTemplateColumns: '56px repeat(7, 1fr)',
            height: allDayRowHeight,
          }}
        >
          <div className="border-r border-border flex items-start justify-center pt-1">
            <span className="text-xs text-muted-foreground">종일</span>
          </div>
          {/* 종일 셀 (드롭 영역) */}
          <div className="col-span-7 relative">
            <div className="grid grid-cols-7 h-full absolute inset-0">
              {weekDays.map((date, idx) => (
                <DroppableTimeSlot
                  key={idx}
                  id={dateKey(date)}
                  className="border-r border-border last:border-r-0 h-full"
                />
              ))}
            </div>
            {/* 멀티데이 바 오버레이 */}
            {allDayLayouts.map((layout) => (
              <MultiDayBar
                key={layout.schedule.id}
                layout={layout}
                onEdit={openEditModal}
              />
            ))}
          </div>
        </div>

        {/* 시간 그리드 (스크롤) */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto scrollbar-hide">
          <div
            className="relative grid"
            style={{ gridTemplateColumns: '56px repeat(7, 1fr)', height: `${HOUR_HEIGHT * 24}px` }}
          >
            {/* 시간 레이블 열 */}
            <div className="border-r border-border">
              {HOURS.map((h) => (
                <div
                  key={h}
                  className="flex items-start justify-end pr-2 text-xs text-muted-foreground"
                  style={{ height: HOUR_HEIGHT, paddingTop: '2px' }}
                >
                  {h === 0 ? '' : `${String(h).padStart(2, '0')}:00`}
                </div>
              ))}
            </div>

            {/* 각 요일 열 */}
            {weekDays.map((date, colIdx) => {
              const daySchedules = getTimedSchedules(date)
              const isCurrentDay = isToday(date)

              return (
                <div
                  key={colIdx}
                  className="relative border-r border-border last:border-r-0"
                >
                  {/* 시간 구분선 + 드롭 영역 */}
                  {HOURS.map((h) => (
                    <DroppableTimeSlot
                      key={h}
                      id={timeKey(date, h)}
                      className="absolute w-full border-t border-border/50"
                      style={{ top: h * HOUR_HEIGHT, height: HOUR_HEIGHT } as React.CSSProperties}
                      onClick={() => {
                        const clickedDate = new Date(date)
                        clickedDate.setHours(h, 0, 0, 0)
                        setSelectedDate(date)
                        openCreateModal(clickedDate)
                      }}
                    />
                  ))}

                  {/* 현재 시각 표시선 */}
                  {isCurrentDay && (
                    <div
                      className="absolute w-full z-10 flex items-center pointer-events-none"
                      style={{ top: currentTimeTop }}
                    >
                      <div className="w-2 h-2 rounded-full bg-red-500 -ml-1 shrink-0" />
                      <div className="flex-1 h-px bg-red-500" />
                    </div>
                  )}

                  {/* 시간대 일정 블록 */}
                  {daySchedules.map((s) => {
                    const start = toDate(s.startAt as Timestamp | Date | string)
                    const end = toDate(s.endAt as Timestamp | Date | string)
                    const { top, height } = getEventPosition(start, end)

                    return (
                      <TimedEventBlock
                        key={s.id}
                        schedule={s}
                        top={top}
                        height={height}
                        onEdit={openEditModal}
                      />
                    )
                  })}
                </div>
              )
            })}
          </div>
        </div>
      </div>

      <DragOverlay modifiers={[snapCenterToCursor]} dropAnimation={null}>
        {draggingSchedule && <DragPreview schedule={draggingSchedule} />}
      </DragOverlay>
    </DndContext>
  )
}

// ─── 시간대 이벤트 블록 (드래그 가능) ─────────────────────

function TimedEventBlock({
  schedule: s,
  top,
  height,
  onEdit,
}: {
  schedule: Schedule
  top: number
  height: number
  onEdit: (id: string) => void
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: s.id,
    data: { schedule: s, type: 'timed' },
  })

  return (
    <button
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      onClick={(e) => { e.stopPropagation(); onEdit(s.id) }}
      className={cn(
        'absolute left-0.5 right-0.5 rounded px-1.5 text-xs text-left z-20 overflow-hidden',
        'cursor-grab hover:opacity-80 transition-opacity select-none',
        isDragging && 'opacity-30',
        s.isDone && 'opacity-50',
      )}
      style={{
        top,
        height: Math.max(height, 22),
        backgroundColor: s.color + '30',
        color: s.color,
        border: `1px solid ${s.color}60`,
      }}
    >
      <span className={cn('font-medium', s.isDone && 'line-through')}>{s.title}</span>
      {height >= 40 && (
        <div className="opacity-80">
          {formatDate(toDate(s.startAt as Timestamp | Date | string), 'HH:mm')}
        </div>
      )}
    </button>
  )
}
