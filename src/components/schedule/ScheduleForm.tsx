'use client'

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
})

// ─── 상수 ────────────────────────────────────────────────

const PRIORITY_OPTIONS: { value: Priority; label: string }[] = [
  { value: 'critical', label: '🔴 긴급' },
  { value: 'high',     label: '🟠 높음' },
  { value: 'medium',   label: '🔵 보통' },
  { value: 'low',      label: '⚪ 낮음' },
]

const ADVANCE_OPTIONS = [
  { value: 10,   label: '10분 전' },
  { value: 30,   label: '30분 전' },
  { value: 60,   label: '1시간 전' },
  { value: 1440, label: '1일 전' },
  { value: 10080, label: '7일 전' },
  { value: 21600, label: '보름 전' },
  { value: 43200, label: '한 달 전' },
]

const PRESET_COLORS = [
  '#007AFF', '#34C759', '#FF9500', '#FF3B30',
  '#AF52DE', '#FF2D55', '#5AC8FA', '#FFCC00',
]


// ─── Props ───────────────────────────────────────────────

interface Props {
  defaultValues?: Partial<ScheduleFormValues>
  onSubmit: (values: ScheduleFormValues) => void
  onCancel: () => void
  isLoading?: boolean
}

// ─── 컴포넌트 ────────────────────────────────────────────

export function ScheduleForm({ defaultValues, onSubmit, onCancel, isLoading }: Props) {
  const now = new Date()
  const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000)

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

  const isAllDay = watch('isAllDay')
  const priority = watch('priority')
  const color = watch('color')
  const repeatEnabled = watch('repeat.enabled')
  const repeatType = watch('repeat.type')
  const repeatEndType = watch('repeat.endType')
  const advanceTimes = watch('notifications.advanceTimes')
  const emailNotif = watch('notifications.email')
  const smsNotif = watch('notifications.sms')

  const toggleAdvanceTime = (minutes: number) => {
    const current = advanceTimes ?? []
    if (current.includes(minutes)) {
      setValue('notifications.advanceTimes', current.filter((t) => t !== minutes))
    } else {
      setValue('notifications.advanceTimes', [...current, minutes])
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">

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
      <div className="space-y-1.5">
        <Label>메모</Label>
        <RichTextEditor
          value={defaultValues?.description ?? ''}
          onChange={(html) => setValue('description', html)}
          placeholder="러프하게 적어도 돼요 (추후 AI가 정리해드려요)"
        />
      </div>

      {/* 종일 여부 */}
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

      {/* 날짜/시간 — 종일 체크 시 숨김 */}
      {!isAllDay && (
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>시작</Label>
            <DateTimePicker
              value={watch('startAt') ?? now}
              onChange={(date) => setValue('startAt', date)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>종료</Label>
            <DateTimePicker
              value={watch('endAt') ?? oneHourLater}
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

      {/* 반복 */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Checkbox
            id="repeatEnabled"
            checked={repeatEnabled}
            onCheckedChange={(checked) => setValue('repeat.enabled', !!checked)}
          />
          <Label htmlFor="repeatEnabled" className="cursor-pointer">
            반복
          </Label>
        </div>

        {repeatEnabled && (
          <div className="pl-6 space-y-2">
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
                onValueChange={(v) => setValue('repeat.type', v as never)}
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

            <div className="flex items-center gap-2">
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
            </div>
          </div>
        )}
      </div>

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
