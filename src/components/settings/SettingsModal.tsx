'use client'

import { useEffect, useState } from 'react'
import { SendHorizonal, CheckCircle2, XCircle, Sparkles } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Bell, Mail, MessageSquare, Clock } from 'lucide-react'
import { useUiStore } from '@/stores/uiStore'
import { useUserSettings, useSaveUserSettings } from '@/hooks/useUserSettings'
import { useAuth } from '@/hooks/useAuth'
import { cn } from '@/lib/utils'

const ADVANCE_OPTIONS = [
  { value: 10,   label: '10분 전' },
  { value: 30,   label: '30분 전' },
  { value: 60,   label: '1시간 전' },
  { value: 1440, label: '1일 전' },
  { value: 10080, label: '7일 전' },
  { value: 21600, label: '보름 전' },
  { value: 43200, label: '한 달 전' },
]

export function SettingsModal() {
  const { isSettingsModalOpen, closeSettingsModal } = useUiStore()
  const { user } = useAuth()
  const { data: settings } = useUserSettings()
  const saveSettings = useSaveUserSettings()

  // 로컬 폼 상태
  const [emailEnabled, setEmailEnabled] = useState(false)
  const [smsEnabled, setSmsEnabled] = useState(false)
  const [emailAddress, setEmailAddress] = useState('')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [advanceMinutes, setAdvanceMinutes] = useState<number[]>([30])
  const [testStatus, setTestStatus] = useState<'idle' | 'sending' | 'ok' | 'error'>('idle')
  const [triggerStatus, setTriggerStatus] = useState<'idle' | 'checking' | 'done'>('idle')
  const [triggerMessage, setTriggerMessage] = useState('')
  const [claudeApiKey, setClaudeApiKey] = useState('')

  // Firestore에서 불러온 설정으로 폼 초기화
  useEffect(() => {
    if (!settings) return
    const n = settings.notifications
    setEmailEnabled(n?.email ?? false)
    setSmsEnabled(n?.sms ?? false)
    setEmailAddress(n?.emailAddress ?? '')
    setPhoneNumber(n?.phoneNumber ?? '')
    setAdvanceMinutes(n?.advanceMinutes ?? [30])
    setClaudeApiKey(settings.claudeApiKey ?? '')
  }, [settings])

  const toggleAdvance = (minutes: number) => {
    setAdvanceMinutes((prev) =>
      prev.includes(minutes) ? prev.filter((m) => m !== minutes) : [...prev, minutes]
    )
  }

  const handleTestEmail = async () => {
    if (!emailAddress) return
    setTestStatus('sending')
    try {
      const res = await fetch('/api/test-notification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: emailAddress }),
      })
      setTestStatus(res.ok ? 'ok' : 'error')
    } catch {
      setTestStatus('error')
    }
    setTimeout(() => setTestStatus('idle'), 3000)
  }

  const handleTriggerNow = async () => {
    if (!user) return
    setTriggerStatus('checking')
    setTriggerMessage('')
    try {
      const res = await fetch('/api/notifications/trigger-now', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.uid }),
      })
      const data = await res.json()
      setTriggerMessage(data.message ?? (res.ok ? '완료' : '오류 발생'))
      setTriggerStatus('done')
    } catch {
      setTriggerMessage('네트워크 오류')
      setTriggerStatus('done')
    }
  }

  const handleSave = async () => {
    await saveSettings.mutateAsync({
      notifications: {
        email: emailEnabled,
        sms: smsEnabled,
        emailAddress,
        phoneNumber,
        advanceMinutes,
      },
      claudeApiKey: claudeApiKey || undefined,
    })
    closeSettingsModal()
  }

  return (
    <Dialog open={isSettingsModalOpen} onOpenChange={(open) => !open && closeSettingsModal()}>
      <DialogContent className="w-[480px] max-w-[90vw]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bell className="w-4 h-4" />
            알림 설정
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-2">

          {/* 이메일 알림 */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Checkbox
                id="emailEnabled"
                checked={emailEnabled}
                onCheckedChange={(v) => setEmailEnabled(!!v)}
              />
              <Label htmlFor="emailEnabled" className="flex items-center gap-1.5 cursor-pointer">
                <Mail className="w-3.5 h-3.5 text-muted-foreground" />
                이메일 알림
              </Label>
            </div>
            {emailEnabled && (
              <div className="pl-6 space-y-1.5">
                <Label htmlFor="emailAddress" className="text-sm text-muted-foreground">
                  받을 이메일 주소
                </Label>
                <div className="flex gap-2">
                  <Input
                    id="emailAddress"
                    type="email"
                    placeholder="example@gmail.com"
                    value={emailAddress}
                    onChange={(e) => setEmailAddress(e.target.value)}
                    className="flex-1"
                  />
                  <button
                    type="button"
                    onClick={handleTestEmail}
                    disabled={!emailAddress || testStatus === 'sending'}
                    title="테스트 이메일 발송"
                    className={cn(
                      'px-3 rounded-lg border text-xs font-medium transition-colors shrink-0 flex items-center gap-1.5',
                      testStatus === 'ok' && 'border-green-500 text-green-600 bg-green-50',
                      testStatus === 'error' && 'border-destructive text-destructive bg-destructive/5',
                      testStatus === 'idle' && 'border-input text-muted-foreground hover:text-foreground hover:border-foreground',
                      testStatus === 'sending' && 'opacity-50 cursor-wait',
                    )}
                  >
                    {testStatus === 'ok' && <><CheckCircle2 className="w-3.5 h-3.5" /> 발송됨</>}
                    {testStatus === 'error' && <><XCircle className="w-3.5 h-3.5" /> 실패</>}
                    {(testStatus === 'idle' || testStatus === 'sending') && (
                      <><SendHorizonal className="w-3.5 h-3.5" /> 테스트</>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* SMS 알림 */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Checkbox
                id="smsEnabled"
                checked={smsEnabled}
                onCheckedChange={(v) => setSmsEnabled(!!v)}
              />
              <Label htmlFor="smsEnabled" className="flex items-center gap-1.5 cursor-pointer">
                <MessageSquare className="w-3.5 h-3.5 text-muted-foreground" />
                문자(SMS) 알림
                <span className="text-xs text-muted-foreground font-normal">(준비 중)</span>
              </Label>
            </div>
            {smsEnabled && (
              <div className="pl-6 space-y-1.5">
                <Label htmlFor="phoneNumber" className="text-sm text-muted-foreground">
                  받을 전화번호
                </Label>
                <Input
                  id="phoneNumber"
                  type="tel"
                  placeholder="010-0000-0000"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                />
              </div>
            )}
          </div>

          {/* 기본 알림 시점 */}
          {(emailEnabled || smsEnabled) && (
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5 text-sm">
                <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                기본 알림 시점
                <span className="text-xs text-muted-foreground font-normal ml-1">
                  (일정별 개별 설정 가능)
                </span>
              </Label>
              <div className="flex flex-wrap gap-2">
                {ADVANCE_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => toggleAdvance(opt.value)}
                    className={cn(
                      'px-3 py-1.5 rounded-full text-xs font-medium border transition-colors',
                      advanceMinutes.includes(opt.value)
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-background text-muted-foreground border-input hover:border-foreground'
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 지금 알림 확인 */}
          <div className="border-t border-border pt-4 space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">지금 알림 확인</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  지금 발송해야 할 알림이 있으면 즉시 발송해요
                </p>
              </div>
              <button
                type="button"
                onClick={handleTriggerNow}
                disabled={triggerStatus === 'checking'}
                className={cn(
                  'px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors shrink-0',
                  triggerStatus === 'checking' && 'opacity-50 cursor-wait border-input text-muted-foreground',
                  triggerStatus !== 'checking' && 'border-input text-muted-foreground hover:text-foreground hover:border-foreground',
                )}
              >
                {triggerStatus === 'checking' ? '확인 중...' : '지금 확인'}
              </button>
            </div>
            {triggerMessage && (
              <p className="text-xs text-muted-foreground bg-muted px-3 py-2 rounded-lg">
                {triggerMessage}
              </p>
            )}
          </div>

          {/* Claude AI 설정 */}
          <div className="space-y-3 pt-4 border-t">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              <Label className="text-sm font-semibold">AI 설정</Label>
            </div>
            <div className="space-y-1.5 pl-6">
              <Label htmlFor="claudeApiKey" className="text-sm text-muted-foreground">
                Claude API 키
              </Label>
              <p className="text-xs text-muted-foreground">
                <a href="https://console.anthropic.com/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                  여기서 API 키를 발급
                </a>
                받고 입력해주세요 (일정을 AI로 정리할 때 사용됩니다)
              </p>
              <Input
                id="claudeApiKey"
                type="password"
                placeholder="sk-ant-..."
                value={claudeApiKey}
                onChange={(e) => setClaudeApiKey(e.target.value)}
                className="text-sm"
              />
              <p className="text-xs text-muted-foreground">
                ⚠️ API 키는 안전하게 보관됩니다. 절대 공개하지 마세요.
              </p>
            </div>
          </div>

        </div>

        {/* 버튼 */}
        <div className="flex gap-2">
          <Button variant="outline" onClick={closeSettingsModal} className="flex-1">
            취소
          </Button>
          <Button
            onClick={handleSave}
            disabled={saveSettings.isPending}
            className="flex-1"
          >
            {saveSettings.isPending ? '저장 중...' : '저장'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
