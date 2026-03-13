import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/firebase/config'
import { collection, getDocs, query, where, updateDoc, doc, Timestamp } from 'firebase/firestore'
import { sendReminderEmail } from '@/lib/notifications/email'
import { sendReminderSms } from '@/lib/notifications/sms'

// Vercel Cron: vercel.json 에서 "0 * * * *" (매 시간) 등으로 설정
// 이 API는 CRON_SECRET 헤더로 보호됨

export async function GET(req: NextRequest) {
  // Vercel Cron은 "Authorization: Bearer {CRON_SECRET}" 헤더를 전송
  const authHeader = req.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const now = new Date()
  let notifiedCount = 0

  try {
    // 모든 사용자 순회
    const usersSnap = await getDocs(collection(db, 'users'))

    for (const userDoc of usersSnap.docs) {
      const userData = userDoc.data()
      const userId = userDoc.id
      const settings = userData.settings?.notifications

      if (!settings?.email && !settings?.sms) continue

      // 미래 일정만 조회 (isDone 필터는 composite index 필요 → JS에서 처리)
      const schedulesSnap = await getDocs(
        query(
          collection(db, 'users', userId, 'schedules'),
          where('startAt', '>', Timestamp.fromDate(now))
        )
      )

      for (const schedDoc of schedulesSnap.docs) {
        // 완료된 일정 건너뜀
        if (schedDoc.data().isDone === true) continue
        const schedule = schedDoc.data()
        const startAt: Date = schedule.startAt.toDate()
        const advanceTimes: number[] = schedule.notifications?.advanceTimes ?? []
        const sentFlags: boolean[] = schedule.notifications?.sentFlags ?? []

        for (let i = 0; i < advanceTimes.length; i++) {
          if (sentFlags[i]) continue // 이미 발송됨

          const triggerTime = new Date(
            startAt.getTime() - advanceTimes[i] * 60 * 1000
          )

          // 현재 시간이 트리거 시간을 지났는지 확인 (10분 여유)
          const diff = now.getTime() - triggerTime.getTime()
          if (diff >= 0 && diff <= 10 * 60 * 1000) {
            // 이메일 발송 (유저 설정 + 일정별 설정 모두 ON)
            if (settings.email && settings.emailAddress && schedule.notifications?.email) {
              await sendReminderEmail({
                to: settings.emailAddress,
                scheduleTitle: schedule.title,
                scheduleStartAt: startAt,
                minutesBefore: advanceTimes[i],
              })
            }

            // SMS 발송 (유저 설정 + 일정별 설정 모두 ON)
            if (settings.sms && settings.phoneNumber && schedule.notifications?.sms) {
              await sendReminderSms({
                to: settings.phoneNumber,
                scheduleTitle: schedule.title,
                minutesBefore: advanceTimes[i],
              })
            }

            // sentFlags 업데이트
            const newFlags = [...sentFlags]
            newFlags[i] = true
            await updateDoc(
              doc(db, 'users', userId, 'schedules', schedDoc.id),
              { 'notifications.sentFlags': newFlags }
            )

            notifiedCount++
          }
        }
      }
    }

    return NextResponse.json({ ok: true, notifiedCount })
  } catch (error) {
    console.error('Cron error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
