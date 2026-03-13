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
  const now = Timestamp.now()
  const q = query(
    schedulesRef(userId),
    where('startAt', '>=', now),
    orderBy('startAt', 'asc')
  )
  const snapshot = await getDocs(q)
  return snapshot.docs
    .slice(0, limit_)
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
  const data: Record<string, unknown> = {
    ...values,
    updatedAt: serverTimestamp(),
  }
  if (values.startAt) data.startAt = Timestamp.fromDate(values.startAt)
  if (values.endAt) data.endAt = Timestamp.fromDate(values.endAt)
  if (values.repeat) data.repeat = sanitizeRepeat(values.repeat)

  await updateDoc(scheduleRef(userId, scheduleId), data)
}

export async function deleteSchedule(
  userId: string,
  scheduleId: string
): Promise<void> {
  await deleteDoc(scheduleRef(userId, scheduleId))
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
