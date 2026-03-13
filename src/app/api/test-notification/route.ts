import { NextRequest, NextResponse } from 'next/server'
import { sendReminderEmail } from '@/lib/notifications/email'

// 로컬 테스트용 — 이메일 발송이 실제로 되는지 확인
// POST /api/test-notification  { "to": "your@email.com" }
export async function POST(req: NextRequest) {
  // 개발 환경에서만 허용
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not allowed in production' }, { status: 403 })
  }

  try {
    const { to } = await req.json()
    if (!to) {
      return NextResponse.json({ error: 'to 이메일 주소가 필요합니다' }, { status: 400 })
    }

    await sendReminderEmail({
      to,
      scheduleTitle: '테스트 일정',
      scheduleStartAt: new Date(Date.now() + 30 * 60 * 1000),
      minutesBefore: 30,
    })

    return NextResponse.json({ ok: true, message: `${to} 로 테스트 이메일 발송 완료` })
  } catch (error) {
    console.error('테스트 이메일 오류:', error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
