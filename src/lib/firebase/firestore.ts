import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  getDoc,
  setDoc,
  query,
  where,
  orderBy,
  Timestamp,
  serverTimestamp,
  deleteField,
} from 'firebase/firestore'
import { db } from './config'
import type { Schedule, Tag, ScheduleFormValues, UserSettings } from '@/types'

// ─── 경로 헬퍼 ───────────────────────────────────────────

const schedulesRef = (userId: string) =>
  collection(db, 'users', userId, 'schedules')

const scheduleRef = (userId: string, scheduleId: string) =>
  doc(db, 'users', userId, 'schedules', scheduleId)

const tagsRef = (userId: string) =>
  collection(db, 'users', userId, 'tags')

const tagRef = (userId: string, tagId: string) =>
  doc(db, 'users', userId, 'tags', tagId)

// ─── 일정 CRUD ───────────────────────────────────────────

export async function fetchSchedules(userId: string): Promise<Schedule[]> {
  const q = query(schedulesRef(userId), orderBy('startAt', 'asc'))
  const snapshot = await getDocs(q)
  return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Schedule))
}

export async function fetchSchedulesByRange(
  userId: string,
  startDate: Date,
  endDate: Date
): Promise<Schedule[]> {
  const q = query(
    schedulesRef(userId),
    where('startAt', '>=', Timestamp.fromDate(startDate)),
    where('startAt', '<=', Timestamp.fromDate(endDate)),
    orderBy('startAt', 'asc')
  )
  const snapshot = await getDocs(q)
  return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Schedule))
}

export async function fetchUpcomingSchedules(
  userId: string,
  limit_: number = 20
): Promise<Schedule[]> {
  // 진행 중인 일정도 포함하기 위해 60일 전부터 조회
  const past = new Date()
  past.setDate(past.getDate() - 60)
  const q = query(
    schedulesRef(userId),
    where('startAt', '>=', Timestamp.fromDate(past)),
    orderBy('startAt', 'asc')
  )
  const snapshot = await getDocs(q)
  return snapshot.docs
    .map(d => ({ id: d.id, ...d.data() } as Schedule))
}

export async function createSchedule(
  userId: string,
  values: ScheduleFormValues
): Promise<string> {
  const data = {
    ...values,
    startAt: Timestamp.fromDate(values.startAt),
    endAt: Timestamp.fromDate(values.endAt),
    repeat: {
      ...values.repeat,
      endDate: values.repeat.endDate
        ? Timestamp.fromDate(values.repeat.endDate)
        : null,
    },
    notifications: {
      ...values.notifications,
      sentFlags: values.notifications.advanceTimes.map(() => false),
    },
    isDone: false,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }
  const ref = await addDoc(schedulesRef(userId), data)
  return ref.id
}

// undefined 값을 deleteField() 또는 null로 변환 (Firestore는 undefined를 허용하지 않음)
function sanitizeRepeat(repeat: ScheduleFormValues['repeat']): Record<string, unknown> {
  return {
    enabled: repeat.enabled,
    type: repeat.type,
    interval: repeat.interval,
    endType: repeat.endType,
    daysOfWeek: repeat.daysOfWeek ?? null,
    endDate: repeat.endDate ? Timestamp.fromDate(repeat.endDate) : null,
    endCount: repeat.endCount ?? null,
  }
}

export async function updateSchedule(
  userId: string,
  scheduleId: string,
  values: Partial<ScheduleFormValues>
): Promise<void> {
  // notifications를 통째로 덮어쓰면 sentFlags가 날아가므로 dot notation으로 개별 업데이트
  const { notifications, repeat, startAt, endAt, ...rest } = values

  const data: Record<string, unknown> = {
    ...rest,
    updatedAt: serverTimestamp(),
  }

  if (startAt) data.startAt = Timestamp.fromDate(startAt)
  if (endAt)   data.endAt   = Timestamp.fromDate(endAt)
  if (repeat)  data.repeat  = sanitizeRepeat(repeat)

  // notifications: dot notation으로 각 필드만 업데이트 + advanceTimes 변경 시 sentFlags 재설정
  if (notifications) {
    data['notifications.email']        = notifications.email
    data['notifications.sms']          = notifications.sms
    data['notifications.advanceTimes'] = notifications.advanceTimes
    // advanceTimes가 바뀌었을 수 있으므로 sentFlags를 새 길이에 맞게 초기화
    data['notifications.sentFlags']    = notifications.advanceTimes.map(() => false)
  }

  await updateDoc(scheduleRef(userId, scheduleId), data)
}

export async function deleteSchedule(
  userId: string,
  scheduleId: string
): Promise<void> {
  await deleteDoc(scheduleRef(userId, scheduleId))
}

// ─── 반복 일정 수정 (3가지 모드) ─────────────────────────

/**
 * [이 일정만] 수정
 * - 원본의 repeat.exceptions에 instanceDate 추가 (해당 날짜 제외)
 * - 해당 날짜에 대한 새 단일 일정 생성
 */
export async function updateRepeatThis(
  userId: string,
  scheduleId: string,
  instanceDate: Date,
  values: ScheduleFormValues
): Promise<void> {
  const originalSnap = await getDoc(scheduleRef(userId, scheduleId))
  const currentExceptions: Timestamp[] = originalSnap.data()?.repeat?.exceptions ?? []

  await updateDoc(scheduleRef(userId, scheduleId), {
    'repeat.exceptions': [...currentExceptions, Timestamp.fromDate(instanceDate)],
    updatedAt: serverTimestamp(),
  })

  const newData = {
    ...values,
    startAt: Timestamp.fromDate(values.startAt),
    endAt:   Timestamp.fromDate(values.endAt),
    repeat: {
      enabled: false, type: 'weekly' as const, interval: 1,
      endType: 'never' as const, daysOfWeek: null,
      endDate: null, endCount: null, exceptions: [],
    },
    notifications: {
      ...values.notifications,
      sentFlags: values.notifications.advanceTimes.map(() => false),
    },
    isDone: false,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }
  await addDoc(schedulesRef(userId), newData)
}

/**
 * [이후 모두] 수정
 * - 원본 일정의 repeat.endDate를 instanceDate 하루 전으로 설정
 * - instanceDate부터 새 일정 생성 (수정된 내용 + 동일 반복 설정)
 */
export async function updateRepeatFollowing(
  userId: string,
  scheduleId: string,
  instanceDate: Date,
  values: ScheduleFormValues
): Promise<void> {
  const dayBefore = new Date(instanceDate.getTime() - 24 * 60 * 60 * 1000)

  await updateDoc(scheduleRef(userId, scheduleId), {
    'repeat.endType': 'date',
    'repeat.endDate': Timestamp.fromDate(dayBefore),
    updatedAt: serverTimestamp(),
  })

  const newData = {
    ...values,
    startAt: Timestamp.fromDate(values.startAt),
    endAt:   Timestamp.fromDate(values.endAt),
    repeat: {
      ...sanitizeRepeat(values.repeat),
      exceptions: [],
    },
    notifications: {
      ...values.notifications,
      sentFlags: values.notifications.advanceTimes.map(() => false),
    },
    isDone: false,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }
  await addDoc(schedulesRef(userId), newData)
}

/**
 * [전체] 수정
 * - 기존 updateSchedule과 동일 + exceptions 초기화
 */
export async function updateRepeatAll(
  userId: string,
  scheduleId: string,
  values: Partial<ScheduleFormValues>
): Promise<void> {
  const { notifications, repeat, startAt, endAt, ...rest } = values
  const data: Record<string, unknown> = { ...rest, updatedAt: serverTimestamp() }

  if (startAt) data.startAt = Timestamp.fromDate(startAt)
  if (endAt)   data.endAt   = Timestamp.fromDate(endAt)
  if (repeat)  data.repeat  = { ...sanitizeRepeat(repeat), exceptions: [] }

  if (notifications) {
    data['notifications.email']        = notifications.email
    data['notifications.sms']          = notifications.sms
    data['notifications.advanceTimes'] = notifications.advanceTimes
    data['notifications.sentFlags']    = notifications.advanceTimes.map(() => false)
  }

  await updateDoc(scheduleRef(userId, scheduleId), data)
}

export async function toggleScheduleDone(
  userId: string,
  scheduleId: string,
  isDone: boolean
): Promise<void> {
  await updateDoc(scheduleRef(userId, scheduleId), {
    isDone,
    updatedAt: serverTimestamp(),
  })
}

// ─── 태그 CRUD ───────────────────────────────────────────

export async function fetchTags(userId: string): Promise<Tag[]> {
  const snapshot = await getDocs(tagsRef(userId))
  return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Tag))
}

export async function createTag(
  userId: string,
  tag: Omit<Tag, 'id' | 'createdAt'>
): Promise<string> {
  const ref = await addDoc(tagsRef(userId), {
    ...tag,
    createdAt: serverTimestamp(),
  })
  return ref.id
}

export async function deleteTag(userId: string, tagId: string): Promise<void> {
  await deleteDoc(tagRef(userId, tagId))
}

// ─── 유저 설정 ───────────────────────────────────────────

const userDocRef = (userId: string) => doc(db, 'users', userId)

export async function fetchUserSettings(userId: string): Promise<UserSettings | null> {
  const snap = await getDoc(userDocRef(userId))
  if (!snap.exists()) return null
  return (snap.data().settings as UserSettings) ?? null
}

export async function saveUserSettings(
  userId: string,
  settings: Partial<UserSettings>
): Promise<void> {
  await setDoc(userDocRef(userId), { settings }, { merge: true })
}
