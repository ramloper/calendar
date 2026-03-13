'use client'

import { useState } from 'react'
import { ko } from 'date-fns/locale'
import { format } from 'date-fns'
import { CalendarIcon } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'

interface Props {
  value: Date
  onChange: (date: Date) => void
  label?: string
}

const HOURS = Array.from({ length: 24 }, (_, i) => i)
const MINUTES = [0, 10, 15, 20, 30, 45]

export function DateTimePicker({ value, onChange, label }: Props) {
  const [open, setOpen] = useState(false)

  const handleDaySelect = (day: Date | undefined) => {
    if (!day) return
    const next = new Date(day)
    next.setHours(value.getHours(), value.getMinutes(), 0, 0)
    onChange(next)
    setOpen(false)
  }

  const handleHourChange = (h: string | null) => {
    if (h === null) return
    const next = new Date(value)
    next.setHours(Number(h))
    onChange(next)
  }

  const handleMinuteChange = (m: string | null) => {
    if (m === null) return
    const next = new Date(value)
    next.setMinutes(Number(m))
    onChange(next)
  }

  // 현재 minutes 값이 프리셋에 없으면 가장 가까운 값 표시
  const currentMinute = MINUTES.includes(value.getMinutes())
    ? value.getMinutes()
    : MINUTES.reduce((a, b) =>
        Math.abs(b - value.getMinutes()) < Math.abs(a - value.getMinutes()) ? b : a
      )

  return (
    <div className="flex gap-2 items-center">
      {/* 날짜 Popover */}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          render={
            <Button
              variant="outline"
              className={cn(
                'flex-1 justify-start text-left font-normal h-10',
                !value && 'text-muted-foreground'
              )}
            />
          }
        >
          <CalendarIcon className="mr-2 h-4 w-4 text-muted-foreground" />
          {format(value, 'yyyy년 M월 d일 (EEE)', { locale: ko })}
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={value}
            onSelect={handleDaySelect}
            locale={ko}
            initialFocus
          />
        </PopoverContent>
      </Popover>

      {/* 시간 Select */}
      <Select
        value={String(value.getHours())}
        onValueChange={handleHourChange}
      >
        <SelectTrigger className="w-20 h-10">
          <SelectValue>
            {String(value.getHours()).padStart(2, '0')}시
          </SelectValue>
        </SelectTrigger>
        <SelectContent className="max-h-48">
          {HOURS.map((h) => (
            <SelectItem key={h} value={String(h)}>
              {String(h).padStart(2, '0')}시
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* 분 Select */}
      <Select
        value={String(currentMinute)}
        onValueChange={handleMinuteChange}
      >
        <SelectTrigger className="w-20 h-10">
          <SelectValue>
            {String(currentMinute).padStart(2, '0')}분
          </SelectValue>
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
