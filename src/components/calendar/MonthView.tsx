'use client'

import { useMemo, useRef, useState, useCallback } from 'react'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  pointerWithin,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
} from '@dnd-kit/core'
import { snapCenterToCursor } from '@dnd-kit/modifiers'
import { useDroppable, useDraggable } from '@dnd-kit/core'
import { addDays, differenceInCalendarDays, startOfDay } from 'date-fns'
import { Timestamp } from 'firebase/firestore'

import { useAuth } from '@/hooks/useAuth'
import { useSchedules, useUpdateSchedule } from '@/hooks/useSchedules'
import { useCalendarStore } from '@/stores/calendarStore'
import { useUiStore } from '@/stores/uiStore'
import { getMonthGrid, isSameMonth, isSameDay, isToday, getWeekDays } from '@/lib/utils/date'
import { computeWeekLayout, maxSlots, isMultiDay, toDate, type EventLayout } from '@/lib/utils/multiday'
import { expandForMonth } from '@/lib/utils/repeat'
import { cn } from '@/lib/utils'
import type { Schedule } from '@/types'

// ─── 상수 ─────────────────────────────────────────────────

const DAYS_LABEL = ['일', '월', '화', '수', '목', '금', '토']
const SLOT_HEIGHT = 22  // px — 멀티데이 바 1개 높이
const SLOT_GAP = 2      // px — 바 사이 간격
const DATE_HEADER_H = 32 // px — 날짜 숫자 영역

const PRIORITY_COLORS: Record<string, string> = {
  critical: 'bg-red-500',
  high: 'bg-orange-400',
  medium: 'bg-blue-500',
  low: 'bg-gray-400',
}

// ─── 날짜 키 ──────────────────────────────────────────────

function dateKey(date: Date): string {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`
}

// ─── 드롭 가능한 날짜 셀 ───────────────────────────────────

function DroppableCell({
  date,
  isOver,
  children,
  className,
  onClick,
}: {
  date: Date
  isOver?: boolean
  children: React.ReactNode
  className?: string
  onClick?: () => void
}) {
  const { setNodeRef, isOver: dndIsOver } = useDroppable({ id: dateKey(date) })

  return (
    <div
      ref={setNodeRef}
      onClick={onClick}
      className={cn(className, dndIsOver && 'bg-primary/10')}
    >
      {children}
    </div>
  )
}

// ─── 드래그 가능한 멀티데이 이벤트 바 ──────────────────────

function DraggableMultiDayBar({
  layout,
  slotCount,
  onEdit,
}: {
  layout: EventLayout
  slotCount: number
  onEdit: (id: string) => void
}) {
  const { schedule, colStart, colSpan, slot, isStart, isEnd } = layout
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: schedule.id,
    data: { schedule, type: 'multiday' },
  })

  const topPx = DATE_HEADER_H + slot * (SLOT_HEIGHT + SLOT_GAP)
  const leftPct = (colStart / 7) * 100
  const widthPct = (colSpan / 7) * 100

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      onClick={(e) => { e.stopPropagation(); onEdit(schedule.id) }}
      className={cn(
        'absolute h-[22px] flex items-center px-2 text-xs font-medium cursor-grab select-none z-20',
        'transition-opacity',
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

// ─── 드래그 가능한 단일 일정 필 ────────────────────────────

function DraggableSinglePill({
  schedule,
  onEdit,
}: {
  schedule: Schedule
  onEdit: (id: string) => void
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: schedule.id,
    data: { schedule, type: 'single' },
  })

  return (
    <button
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      onClick={(e) => { e.stopPropagation(); onEdit(schedule.id) }}
      className={cn(
        'w-full text-left px-1.5 py-0.5 rounded text-xs truncate flex items-center gap-1',
        'cursor-grab hover:opacity-80 transition-opacity select-none',
        isDragging && 'opacity-30',
        schedule.isDone && 'opacity-50 line-through',
      )}
      style={{ backgroundColor: schedule.color + '20', color: schedule.color }}
    >
      <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', PRIORITY_COLORS[schedule.priority])} />
      {schedule.title}
    </button>
  )
}

// ─── 드래그 오버레이 (드래그 중인 미리보기) ────────────────

function DragPreview({ schedule }: { schedule: Schedule }) {
  return (
    <div
      className="px-2 py-1 rounded-md text-xs font-medium shadow-lg pointer-events-none opacity-90"
      style={{ backgroundColor: schedule.color + '40', color: schedule.color, border: `1px solid ${schedule.color}70` }}
    >
      {schedule.title}
    </div>
  )
}

// ─── 주 행 (WeekRow) ──────────────────────────────────────

function WeekRow({
  weekDays,
  schedules,
  currentDate,
  selectedDate,
  onSelectDate,
  onEdit,
}: {
  weekDays: Date[]
  schedules: Schedule[]
  currentDate: Date
  selectedDate: Date | null
  onSelectDate: (d: Date) => void
  onEdit: (id: string) => void
}) {
  const layouts = useMemo(() => computeWeekLayout(weekDays, schedules), [weekDays, schedules])
  const slotCount = useMemo(() => maxSlots(layouts), [layouts])

  // 단일 일정: 멀티데이가 아닌 것들, 날짜별 그룹핑
  const singleByDate = useMemo(() => {
    const map = new Map<string, Schedule[]>()
    for (const s of schedules) {
      if (isMultiDay(s)) continue
      const start = toDate(s.startAt as Timestamp | Date | string)
      if (weekDays.some((d) => isSameDay(d, start))) {
        const k = dateKey(start)
        if (!map.has(k)) map.set(k, [])
        map.get(k)!.push(s)
      }
    }
    return map
  }, [schedules, weekDays])

  // 멀티데이 슬롯 예약 높이
  const reservedHeight = slotCount > 0
    ? slotCount * (SLOT_HEIGHT + SLOT_GAP) + 4
    : 0

  const rowHeight = DATE_HEADER_H + reservedHeight + 60 // 단일 일정 공간

  return (
    <div className="relative border-b border-border last:border-b-0" style={{ minHeight: rowHeight }}>
      {/* 날짜 셀 그리드 */}
      <div className="grid grid-cols-7 h-full">
        {weekDays.map((date, idx) => {
          const isCurrentMonth = isSameMonth(date, currentDate)
          const isTodayDate = isToday(date)
          const isSelected = selectedDate ? isSameDay(date, selectedDate) : false
          const dayOfWeek = date.getDay()
          const singles = singleByDate.get(dateKey(date)) ?? []
          const MAX_SINGLES = Math.max(1, Math.floor((rowHeight - DATE_HEADER_H - reservedHeight - 8) / 22))

          return (
            <DroppableCell
              key={idx}
              date={date}
              onClick={() => onSelectDate(date)}
              className={cn(
                'border-r border-border last:border-r-0 p-1 cursor-pointer transition-colors',
                !isCurrentMonth && 'bg-muted/20',
                isSelected && 'bg-primary/5 ring-1 ring-inset ring-primary/30',
                !isSelected && 'hover:bg-accent/30',
              )}
            >
              {/* 날짜 숫자 */}
              <div className="flex items-center justify-center w-7 h-7 mb-0.5">
                <span className={cn(
                  'w-7 h-7 flex items-center justify-center rounded-full text-sm',
                  !isCurrentMonth && 'text-muted-foreground/40',
                  isCurrentMonth && dayOfWeek === 0 && 'text-red-500',
                  isCurrentMonth && dayOfWeek === 6 && 'text-blue-500',
                  isCurrentMonth && dayOfWeek !== 0 && dayOfWeek !== 6 && 'text-foreground',
                  isTodayDate && 'bg-primary text-primary-foreground font-semibold',
                )}>
                  {date.getDate()}
                </span>
              </div>

              {/* 멀티데이 슬롯 예약 공간 (바는 absolute로 오버레이에 렌더링) */}
              {slotCount > 0 && (
                <div style={{ height: reservedHeight }} />
              )}

              {/* 단일 일정 */}
              <div className="space-y-0.5 mt-0.5">
                {singles.slice(0, MAX_SINGLES).map((s) => (
                  <DraggableSinglePill key={s.id} schedule={s} onEdit={onEdit} />
                ))}
                {singles.length > MAX_SINGLES && (
                  <p className="text-xs text-muted-foreground pl-1">+{singles.length - MAX_SINGLES}개</p>
                )}
              </div>
            </DroppableCell>
          )
        })}
      </div>

      {/* 멀티데이 바 오버레이 (absolute) */}
      {layouts.map((layout) => (
        <DraggableMultiDayBar
          key={layout.schedule.id}
          layout={layout}
          slotCount={slotCount}
          onEdit={onEdit}
        />
      ))}
    </div>
  )
}

// ─── MonthView ────────────────────────────────────────────

export function MonthView() {
  const { user } = useAuth()
  const { currentDate, selectedDate, setSelectedDate } = useCalendarStore()
  const { openEditModal } = useUiStore()
  const { data: schedules } = useSchedules(user?.uid ?? null)
  const updateSchedule = useUpdateSchedule(user?.uid ?? '')

  const [draggingSchedule, setDraggingSchedule] = useState<Schedule | null>(null)

  const grid = getMonthGrid(currentDate)

  // 반복 일정을 이번 달 인스턴스로 펼침
  const expandedSchedules = useMemo(() => {
    try {
      const result = expandForMonth(schedules ?? [], currentDate)
      const repeatOnes = schedules?.filter(s => s.repeat?.enabled) ?? []
      console.log('[repeat debug] raw:', schedules?.length ?? 0,
        '/ expanded:', result.length,
        '/ repeat enabled:', repeatOnes.length)
      if (repeatOnes.length > 0) {
        console.log('[repeat debug] repeat 일정 샘플:', JSON.stringify({
          id: repeatOnes[0].id,
          repeat: repeatOnes[0].repeat,
          startAt: repeatOnes[0].startAt,
        }))
      }
      return result
    } catch (e) {
      console.error('[repeat debug] expandForMonth 에러:', e)
      return schedules ?? []
    }
  }, [schedules, currentDate])

  // 주 단위로 분리 (6주)
  const weeks = useMemo(() => {
    const rows: Date[][] = []
    for (let i = 0; i < grid.length; i += 7) {
      rows.push(grid.slice(i, i + 7))
    }
    return rows
  }, [grid])

  // DnD 센서: 5px 이상 움직여야 드래그 시작 (클릭과 구분)
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

    // over.id = "YYYY-M-D" 형식의 날짜 키
    const [year, month, day] = (over.id as string).split('-').map(Number)
    const targetDate = new Date(year, month, day)
    const originalStart = startOfDay(toDate(schedule.startAt as Timestamp | Date | string))

    const deltaDays = differenceInCalendarDays(targetDate, originalStart)
    if (deltaDays === 0) return

    const newStart = addDays(toDate(schedule.startAt as Timestamp | Date | string), deltaDays)
    const newEnd = addDays(toDate(schedule.endAt as Timestamp | Date | string), deltaDays)

    // 반복 인스턴스 가상 ID(`원본id__timestamp`)에서 원본 ID 추출
    const realId = schedule.id.includes('__') ? schedule.id.split('__')[0] : schedule.id

    updateSchedule.mutate({
      scheduleId: realId,
      values: { startAt: newStart, endAt: newEnd },
    })
  }, [user, updateSchedule])

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={pointerWithin}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex-1 flex flex-col min-h-0 rounded-2xl border border-border overflow-hidden">
        {/* 요일 헤더 */}
        <div className="grid grid-cols-7 border-b border-border bg-muted/30 shrink-0">
          {DAYS_LABEL.map((day, idx) => (
            <div
              key={day}
              className={cn(
                'py-3 text-center text-xs font-medium text-muted-foreground',
                idx === 0 && 'text-red-500',
                idx === 6 && 'text-blue-500',
              )}
            >
              {day}
            </div>
          ))}
        </div>

        {/* 주 행들 */}
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
          {weeks.map((weekDays, rowIdx) => (
            <WeekRow
              key={rowIdx}
              weekDays={weekDays}
              schedules={expandedSchedules}
              currentDate={currentDate}
              selectedDate={selectedDate}
              onSelectDate={(date) => {
                setSelectedDate(date)
              }}
              onEdit={(id) => {
                // 반복 인스턴스 가상 ID에서 원본 ID와 instanceDate 분리
                if (id.includes('__')) {
                  const [realId, ts] = id.split('__')
                  openEditModal(realId, new Date(Number(ts)))
                } else {
                  openEditModal(id)
                }
              }}
            />
          ))}
        </div>
      </div>

      {/* 드래그 중인 일정 미리보기 */}
      <DragOverlay modifiers={[snapCenterToCursor]} dropAnimation={null}>
        {draggingSchedule && <DragPreview schedule={draggingSchedule} />}
      </DragOverlay>
    </DndContext>
  )
}
