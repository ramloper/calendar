// CoolSMS SDK 사용 (npm install coolsms-node-sdk 별도 설치 필요)
// https://github.com/coolsms/coolsms-node-sdk

interface SendSmsParams {
  to: string
  scheduleTitle: string
  minutesBefore: number
}

export async function sendReminderSms({
  to,
  scheduleTitle,
  minutesBefore,
}: SendSmsParams): Promise<void> {
  const timeLabel =
    minutesBefore >= 1440
      ? `${minutesBefore / 1440}일`
      : minutesBefore >= 60
        ? `${minutesBefore / 60}시간`
        : `${minutesBefore}분`

  const text = `[일정 알림] "${scheduleTitle}" ${timeLabel} 후 시작`

  // TODO: CoolSMS SDK 연동
  // const messageService = new coolsms(apiKey, apiSecret)
  // await messageService.sendOne({
  //   to,
  //   from: process.env.COOLSMS_SENDER_NUMBER!,
  //   text,
  // })

  console.log(`SMS 발송 예정 → ${to}: ${text}`)
}
