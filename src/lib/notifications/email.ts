import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

interface SendEmailParams {
  to: string
  scheduleTitle: string
  scheduleStartAt: Date
  minutesBefore: number
}

export async function sendReminderEmail({
  to,
  scheduleTitle,
  scheduleStartAt,
  minutesBefore,
}: SendEmailParams): Promise<void> {
  const timeLabel =
    minutesBefore >= 1440
      ? `${minutesBefore / 1440}일`
      : minutesBefore >= 60
        ? `${minutesBefore / 60}시간`
        : `${minutesBefore}분`

  await resend.emails.send({
    from: 'onboarding@resend.dev',
    to,
    subject: `[일정 알림] ${scheduleTitle} — ${timeLabel} 전`,
    html: `
      <div style="font-family: -apple-system, sans-serif; padding: 24px;">
        <h2 style="color: #191F28;">📅 일정 알림</h2>
        <p style="color: #4E5968; font-size: 16px;">
          <strong>${scheduleTitle}</strong> 일정이 <strong>${timeLabel} 후</strong>에 시작됩니다.
        </p>
        <p style="color: #8B95A1; font-size: 14px;">
          시작 시간: ${scheduleStartAt.toLocaleString('ko-KR')}
        </p>
      </div>
    `,
  })
}
