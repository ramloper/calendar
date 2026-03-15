import { Timestamp } from 'firebase/firestore'

// ─── 사용자 ───────────────────────────────────────────────

export interface User {
  uid: string
  email: string
  displayName: string
  photoURL?: string
  settings: UserSettings
  createdAt: Timestamp
}

export interface UserSettings {
  notifications: NotificationSettings
  theme: 'light' | 'dark' | 'system'
  defaultView: CalendarView
  claudeApiKey?: string  // Claude API 키 (사용자가 설정에서 입력)
}

export interface NotificationSettings {
  email: boolean
  sms: boolean
  emailAddress: string
  phoneNumber: string
  advanceMinutes: number[] // [10, 30, 60, 1440] 분 전 알림
}

// ─── 일정 ───────────────────────────────────────────────

export type Priority = 'low' | 'medium' | 'high' | 'critical'
export type CalendarView = 'month' | 'week' | 'day'
export type RepeatType = 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom'
export type RepeatEndType = 'never' | 'date' | 'count'

export interface RepeatConfig {
  enabled: boolean
  type: RepeatType
  interval: number           // 매 N일/주/월
  daysOfWeek?: number[]      // 주간 반복 시 [0,1,2] (일,월,화)
  endType: RepeatEndType
  endDate?: Timestamp
  endCount?: number
  exceptions?: Timestamp[]   // "이 일정만" 수정/삭제 시 제외할 날짜 목록
}

export interface ScheduleNotification {
  email: boolean
  sms: boolean
  advanceTimes: number[]     // [30, 60] 분 전
  sentFlags: boolean[]       // 발송 완료 여부 (advanceTimes와 1:1 대응)
}

export interface Schedule {
  id: string
  title: string
  description?: string             // 러프한 원본 메모
  descriptionFormatted?: string    // AI 정리 버전 (미래 기능)

  startAt: Timestamp
  endAt: Timestamp
  isAllDay: boolean

  priority: Priority

  color: string                    // hex 색상

  repeat: RepeatConfig

  notifications: ScheduleNotification

  tagIds?: string[]                // 태그 ID 배열

  desktopNotification?: boolean    // Electron 미래 대비

  isDone: boolean
  createdAt: Timestamp
  updatedAt: Timestamp
}

// 폼에서 사용하는 타입 (Timestamp 대신 Date)
export interface ScheduleFormValues {
  title: string
  description?: string
  startAt: Date
  endAt: Date
  isAllDay: boolean
  priority: Priority
  color: string
  repeat: {
    enabled: boolean
    type: RepeatType
    interval: number
    daysOfWeek?: number[]
    endType: RepeatEndType
    endDate?: Date
    endCount?: number
  }
  notifications: {
    email: boolean
    sms: boolean
    advanceTimes: number[]
  }
  tagIds?: string[]  // 태그 ID 배열
}

// ─── 태그 ───────────────────────────────────────────────

export interface Tag {
  id: string
  name: string
  color: string  // hex
  emoji?: string
  createdAt: Timestamp
}

// ─── UI 상태 (stores에서 사용) ──────────────────────────

export type ModalMode = 'create' | 'edit'
