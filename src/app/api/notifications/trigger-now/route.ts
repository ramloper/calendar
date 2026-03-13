import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/firebase/config'
import {
  collection, doc, getDocs, updateDoc,
  query, where, Timestamp, getDoc,
} from 'firebase/firestore'
import { sendReminderEmail } from '@/lib/notifications/email'

// 현재 유저의 알림을 즉시 체크 & 발송
// POST /api/notifications/trigger-now  { "userId": "..." }
export async function POST(req: NextRequest) {
  try {
    const { userId } = await req.json()
    if (!userId) {
      return NextResponse.json({ error: 'userId가 필요합니다' }, { status: 400 })
    }

    // 유저 설정 조회
    const userSnap = await getDoc(doc(db, 'users', userId))
    if (!userSnap.exists()) {
      return NextResponse.json({ error: '유저를 찾을 수 없습니다' }, { status: 404 })
    }
    const settings = userSnap.data().settings?.notifications
    if (!settings?.email || !settings?.emailAddress) {
      return NextResponse.json({
        ok: false,
        message: '이메일 알림 설정이 되어 있지 않아요. 알림 설정에서 이메일을 활성화하고 주소를 입력해주세요.',
      })
    }

    const now = new Date()
    const sent: string[] = []
    const skipped: string[] = []

    // 해당 유저의 미래 일정 조회
    const schedulesSnap = await getDocs(
      query(
        collection(db, 'users', userId, 'schedules'),
        where('startAt', '>', Timestamp.fromDate(now))
      )
    )

    for (const schedDoc of schedulesSnap.docs) {
      const schedule = schedDoc.data()

      // 완료된 일정 건너뜀
      if (schedule.isDone === true) continue
      // 일정 레벨에서 이메일 알림 비활성화된 경우 건너뜀
      if (!schedule.notifications?.email) continue

      const startAt: Date = schedule.startAt.toDate()
      const advanceTimes: number[] = schedule.notifications?.advanceTimes ?? []
      const sentFlags: boolean[] = schedule.notifications?.sentFlags ?? []

      for (let i = 0; i < advanceTimes.length; i++) {
        if (sentFlags[i]) {
          skipped.push(`${schedule.title} (이미 발송됨)`)
          continue
        }

        const triggerTime = new Date(startAt.getTime() - advanceTimes[i] * 60 * 1000)
        const diff = now.getTime() - triggerTime.getTime()

        // 트리거 시간이 지났고 10분 이내인 경우 → 발송
        // 단, 버튼 수동 실행 시에는 1시간 이내까지 허용 (로컬 테스트 편의)
        const WINDOW_MS = 60 * 60 * 1000 // 1시간
        if (diff >= 0 && diff <= WINDOW_MS) {
          await sendReminderEmail({
            to: settings.emailAddress,
            scheduleTitle: schedule.title,
            scheduleStartAt: startAt,
            minutesBefore: advanceTimes[i],
          })

          const newFlags = [...sentFlags]
          newFlags[i] = true
          await updateDoc(doc(db, 'users', userId, 'schedules', schedDoc.id), {
            'notifications.sentFlags': newFlags,
          })

          sent.push(`${schedule.title} (${advanceTimes[i]}분 전 알림)`)
        }
      }
    }

    if (sent.length === 0) {
      return NextResponse.json({
        ok: true,
        message: '지금 발송할 알림이 없어요. 알림 시점이 아직 안 됐거나 이미 발송된 일정만 있어요.',
        sent,
        skipped,
      })
    }

    return NextResponse.json({ ok: true, message: `${sent.length}건 발송 완료`, sent, skipped })
  } catch (error) {
    console.error('trigger-now 오류:', error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
