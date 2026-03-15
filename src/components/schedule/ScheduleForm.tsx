'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RichTextEditor } from '@/components/ui/RichTextEditor'
import { Checkbox } from '@/components/ui/checkbox'
import { DateTimePicker } from '@/components/ui/DateTimePicker'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { useAIFormatting } from '@/hooks/useAI'
import { Sparkles, Loader } from 'lucide-react'
import type { ScheduleFormValues, Priority } from '@/types'

// ─── Zod 스키마 ──────────────────────────────────────────

const schema = z.object({
  title: z.string().min(1, '제목을 입력해주세요'),
  description: z.string().optional(),
  startAt: z.date(),
  endAt: z.date(),
  isAllDay: z.boolean(),
  priority: z.enum(['low', 'medium', 'high', 'critical']),
  color: z.string(),
  repeat: z.object({
    enabled: z.boolean(),
    type: z.enum(['daily', 'weekly', 'monthly', 'yearly', 'custom']),
    interval: z.number().min(1),
    daysOfWeek: z.array(z.number()).optional(),
    endType: z.enum(['never', 'date', 'count']),
    endDate: z.date().optional(),
    endCount: z.number().optional(),
  }),
  notifications: z.object({
    email: z.boolean(),
    sms: z.boolean(),
    advanceTimes: z.array(z.number()),
  }),
  tagIds: z.array(z.string()).optional(),
})

// ─── 상수 ────────────────────────────────────────────────

const PRIORITY_OPTIONS: { value: Priority; label: string }[] = [
  { value: 'critical', label: '🔴 긴급' },
  { value: 'high',     label: '🟠 높음' },
  { value: 'medium',   label: '🔵 보통' },
  { value: 'low',      label: '⚪ 낮음' },
]

const ADVANCE_OPTIONS = [
  { value: 10,    label: '10분 전' },
  { value: 30,    label: '30분 전' },
  { value: 60,    label: '1시간 전' },
  { value: 1440,  label: '1일 전' },
  { value: 10080, label: '7일 전' },
  { value: 21600, label: '보름 전' },
  { value: 43200, label: '한 달 전' },
]

const PRESET_COLORS = [
  '#007AFF', '#34C759', '#FF9500', '#FF3B30',
  '#AF52DE', '#FF2D55', '#5AC8FA', '#FFCC00',
]

const HOURS   = Array.from({ length: 24 }, (_, i) => i)
const MINUTES = [0, 10, 15, 20, 30, 45]

// ─── 시간만 선택하는 인라인 피커 ─────────────────────────

function TimePicker({
  label,
  value,
  onChange,
}: {
  label: string
  value: Date
  onChange: (d: Date) => void
}) {
  const currentMinute = MINUTES.includes(value.getMinutes())
    ? value.getMinutes()
    : MINUTES.reduce((a, b) =>
        Math.abs(b - value.getMinutes()) < Math.abs(a - value.getMinutes()) ? b : a
      )

  return (
    <div className="flex items-center gap-1.5">
      <Label className="text-muted-foreground font-normal shrink-0 w-14">{label}</Label>
      <Select
        value={String(value.getHours())}
        onValueChange={(h) => {
          const next = new Date(value)
          next.setHours(Number(h))
          onChange(next)
        }}
      >
        <SelectTrigger className="w-20 h-9">
          <SelectValue>{String(value.getHours()).padStart(2, '0')}시</SelectValue>
        </SelectTrigger>
        <SelectContent className="max-h-48">
          {HOURS.map((h) => (
            <SelectItem key={h} value={String(h)}>
              {String(h).padStart(2, '0')}시
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select
        value={String(currentMinute)}
        onValueChange={(m) => {
          const next = new Date(value)
          next.setMinutes(Number(m))
          onChange(next)
        }}
      >
        <SelectTrigger className="w-20 h-9">
          <SelectValue>{String(currentMinute).padStart(2, '0')}분</SelectValue>
        </SelectTrigger>
        <SelectContent>
          {MINUTES.map((m) => (
            <SelectItem key={m} value={String(m)}>
              {String(m).padStart(2, '0')}분
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

// ─── Props ───────────────────────────────────────────────

interface Props {
  userId: string
  defaultValues?: Partial<ScheduleFormValues>
  onSubmit: (values: ScheduleFormValues) => void
  onCancel: () => void
  isLoading?: boolean
}

// ─── 컴포넌트 ────────────────────────────────────────────

export function ScheduleForm({ userId, defaultValues, onSubmit, onCancel, isLoading }: Props) {
  const now = new Date()
  const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000)

  // AI 포매팅 훅
  const { isLoading: isAILoading, error: aiError, formattedDescription, formatDescription } = useAIFormatting()

  const { register, handleSubmit, watch, setValue, formState: { errors } } =
    useForm<ScheduleFormValues>({
      resolver: zodResolver(schema),
      defaultValues: {
        title: '',
        description: '',
        startAt: defaultValues?.startAt ?? now,
        endAt: defaultValues?.endAt ?? oneHourLater,
        isAllDay: false,
        priority: 'medium',
        color: '#007AFF',
        repeat: {
          enabled: false,
          type: 'weekly',
          interval: 1,
          endType: 'never',
        },
        notifications: {
          email: false,
          sms: false,
          advanceTimes: [30],
        },
        ...defaultValues,
      },
    })

  const isAllDay      = watch('isAllDay')
  const priority      = watch('priority')
  const color         = watch('color')
  const repeatEnabled = watch('repeat.enabled')
  const repeatType    = watch('repeat.type')
  const repeatEndType = watch('repeat.endType')
  const advanceTimes  = watch('notifications.advanceTimes')
  const emailNotif    = watch('notifications.email')
  const smsNotif      = watch('notifications.sms')
  const startAt       = watch('startAt') ?? now
  const endAt         = watch('endAt') ?? oneHourLater

  const toggleAdvanceTime = (minutes: number) => {
    const current = advanceTimes ?? []
    if (current.includes(minutes)) {
      setValue('notifications.advanceTimes', current.filter((t) => t !== minutes))
    } else {
      setValue('notifications.advanceTimes', [...current, minutes])
    }
  }

  const handleAIFormat = async () => {
    const title = watch('title')
    const description = watch('description') || ''

    if (!title && !description) {
      alert('제목이나 메모를 먼저 입력해주세요')
      return
    }

    await formatDescription({ title, currentDescription: description })
  }

  // AI 포매팅 결과가 있으면 자동으로 폼 업데이트
  useEffect(() => {
    if (formattedDescription) {
      setValue('description', formattedDescription)
    }
  }, [formattedDescription, setValue])

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 relative">

      {/* 제목 */}
      <div className="space-y-1.5">
        <Label htmlFor="title">제목</Label>
        <Input
          id="title"
          {...register('title')}
          placeholder="일정 제목"
          className={errors.title ? 'border-destructive' : ''}
        />
        {errors.title && (
          <p className="text-xs text-destructive">{errors.title.message}</p>
        )}
      </div>

      {/* 메모 */}
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <Label>메모</Label>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleAIFormat}
            disabled={isAILoading || isLoading}
            className="text-xs h-8"
          >
            {isAILoading ? (
              <>
                <Loader className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                정리 중...
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                AI로 정리
              </>
            )}
          </Button>
        </div>
        <RichTextEditor
          value={watch('description') ?? ''}
          onChange={(html) => setValue('description', html)}
          placeholder="러프하게 적어도 돼요 (AI가 정리해드려요)"
        />
        {aiError && (
          <p className="text-xs text-destructive">AI 정리 실패: {aiError}</p>
        )}
      </div>

      {/* 종일 + 반복 — 같은 행 */}
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2">
          <Checkbox
            id="isAllDay"
            checked={isAllDay}
            onCheckedChange={(checked) => setValue('isAllDay', !!checked)}
          />
          <Label htmlFor="isAllDay" className="cursor-pointer font-normal">
            종일
          </Label>
        </div>
        <div className="flex items-center gap-2">
          <Checkbox
            id="repeatEnabled"
            checked={repeatEnabled}
            onCheckedChange={(checked) => setValue('repeat.enabled', !!checked)}
          />
          <Label htmlFor="repeatEnabled" className="cursor-pointer font-normal">
            반복
          </Label>
        </div>
      </div>

      {/* 날짜/시간 — 종일도 아니고 반복도 아닐 때만 표시 */}
      {!isAllDay && !repeatEnabled && (
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>시작</Label>
            <DateTimePicker
              value={startAt}
              onChange={(date) => setValue('startAt', date)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>종료</Label>
            <DateTimePicker
              value={endAt}
              onChange={(date) => setValue('endAt', date)}
            />
          </div>
        </div>
      )}

      {/* 중요도 + 색상 */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>중요도</Label>
          <Select
            value={priority}
            onValueChange={(v) => setValue('priority', v as Priority)}
          >
            <SelectTrigger>
              <SelectValue>
                {PRIORITY_OPTIONS.find((o) => o.value === priority)?.label ?? '선택'}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {PRIORITY_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label>색상</Label>
          <div className="flex items-center gap-1.5 flex-wrap h-10">
            {PRESET_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setValue('color', c)}
                className={cn(
                  'w-7 h-7 rounded-full transition-transform hover:scale-110',
                  color === c && 'ring-2 ring-offset-2 ring-foreground scale-110'
                )}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
        </div>
      </div>

      {/* 반복 설정 패널 */}
      {repeatEnabled && (
        <div className="rounded-xl border border-border bg-muted/20 p-4 space-y-3">

          {/* 시작/종료 시간 */}
          {!isAllDay && (
            <div className="space-y-2 pb-3 border-b border-border">
              <TimePicker
                label="시작 시간"
                value={startAt}
                onChange={(d) => {
                  setValue('startAt', d)
                  // 종료 시간이 시작보다 앞서면 1시간 뒤로 조정
                  if (d.getTime() >= endAt.getTime()) {
                    setValue('endAt', new Date(d.getTime() + 60 * 60 * 1000))
                  }
                }}
              />
              <TimePicker
                label="종료 시간"
                value={endAt}
                onChange={(d) => setValue('endAt', d)}
              />
            </div>
          )}

          {/* 반복 주기 */}
          <div className="flex items-center gap-2">
            <Label className="text-muted-foreground font-normal shrink-0">매</Label>
            <Input
              type="number"
              min={1}
              value={watch('repeat.interval') ?? 1}
              onChange={(e) => {
                const v = Number(e.target.value)
                setValue('repeat.interval', v > 0 ? v : 1)
              }}
              className="w-16 text-center"
            />
            <Select
              value={repeatType}
              onValueChange={(v) => {
                setValue('repeat.type', v as never)
                if (v !== 'weekly') setValue('repeat.daysOfWeek', undefined)
              }}
            >
              <SelectTrigger className="w-24">
                <SelectValue>
                  {{ daily: '일', weekly: '주', monthly: '월', yearly: '년', custom: '직접' }[repeatType]}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">일</SelectItem>
                <SelectItem value="weekly">주</SelectItem>
                <SelectItem value="monthly">월</SelectItem>
                <SelectItem value="yearly">년</SelectItem>
              </SelectContent>
            </Select>
            <Label className="text-muted-foreground font-normal shrink-0">마다</Label>
          </div>

          {/* 주간 반복 시 요일 선택 */}
          {repeatType === 'weekly' && (
            <div className="flex items-center gap-1.5">
              {['일', '월', '화', '수', '목', '금', '토'].map((label, dow) => {
                const selected = (watch('repeat.daysOfWeek') ?? []).includes(dow)
                return (
                  <button
                    key={dow}
                    type="button"
                    onClick={() => {
                      const current = watch('repeat.daysOfWeek') ?? []
                      setValue(
                        'repeat.daysOfWeek',
                        selected ? current.filter((d) => d !== dow) : [...current, dow]
                      )
                    }}
                    className={cn(
                      'w-8 h-8 rounded-full text-xs font-medium border transition-colors',
                      selected
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-background text-muted-foreground border-input hover:border-foreground',
                      dow === 0 && !selected && 'text-red-500',
                      dow === 6 && !selected && 'text-blue-500',
                    )}
                  >
                    {label}
                  </button>
                )
              })}
            </div>
          )}

          {/* 반복 종료 */}
          <div className="flex items-center gap-2 flex-wrap">
            <Label className="text-muted-foreground font-normal shrink-0">종료</Label>
            <Select
              value={repeatEndType}
              onValueChange={(v) => setValue('repeat.endType', v as never)}
            >
              <SelectTrigger className="w-28">
                <SelectValue>
                  {{ never: '계속', date: '날짜 지정', count: '횟수 지정' }[repeatEndType]}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="never">계속</SelectItem>
                <SelectItem value="date">날짜 지정</SelectItem>
                <SelectItem value="count">횟수 지정</SelectItem>
              </SelectContent>
            </Select>

            {/* 횟수 지정 */}
            {repeatEndType === 'count' && (
              <div className="flex items-center gap-1.5">
                <Input
                  type="number"
                  min={1}
                  value={watch('repeat.endCount') ?? 1}
                  onChange={(e) => {
                    const v = Number(e.target.value)
                    setValue('repeat.endCount', v > 0 ? v : 1)
                  }}
                  className="w-20 text-center"
                />
                <Label className="text-muted-foreground font-normal shrink-0">회</Label>
              </div>
            )}

            {/* 날짜 지정 */}
            {repeatEndType === 'date' && (
              <DateTimePicker
                value={watch('repeat.endDate') instanceof Date ? watch('repeat.endDate') as Date : new Date()}
                onChange={(d) => setValue('repeat.endDate', d)}
              />
            )}
          </div>
        </div>
      )}

      {/* 알림 */}
      <div className="space-y-3 border-t border-border pt-4">
        <Label>알림</Label>

        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <Checkbox
              id="emailNotif"
              checked={emailNotif}
              onCheckedChange={(checked) => setValue('notifications.email', !!checked)}
            />
            <Label htmlFor="emailNotif" className="cursor-pointer font-normal">
              이메일
            </Label>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              id="smsNotif"
              checked={smsNotif}
              onCheckedChange={(checked) => setValue('notifications.sms', !!checked)}
            />
            <Label htmlFor="smsNotif" className="cursor-pointer font-normal">
              문자
            </Label>
          </div>
        </div>

        {(emailNotif || smsNotif) && (
          <div className="flex flex-wrap gap-2 pl-1">
            {ADVANCE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => toggleAdvanceTime(opt.value)}
                className={cn(
                  'px-3 py-1.5 rounded-full text-xs font-medium border transition-colors',
                  advanceTimes?.includes(opt.value)
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-background text-muted-foreground border-input hover:border-foreground'
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        )}
      </div>


      {/* 버튼 */}
      <div className="flex gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel} className="flex-1">
          취소
        </Button>
        <Button type="submit" disabled={isLoading} className="flex-1">
          {isLoading ? '저장 중...' : '저장'}
        </Button>
      </div>
    </form>
  )
}
