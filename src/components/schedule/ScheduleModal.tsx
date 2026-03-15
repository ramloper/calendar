'use client'

import { useState, useEffect, useRef } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Trash2, AlertTriangle, RefreshCw } from 'lucide-react'
import { useUiStore } from '@/stores/uiStore'
import { useAuth } from '@/hooks/useAuth'
import {
  useCreateSchedule,
  useUpdateSchedule,
  useUpdateRepeatSchedule,
  useDeleteSchedule,
  useSchedules,
  type RepeatEditMode,
} from '@/hooks/useSchedules'
import { ScheduleForm } from './ScheduleForm'
import type { ScheduleFormValues } from '@/types'
import { Timestamp } from 'firebase/firestore'

// 반복 일정 수정 방식 선택 화면
function RepeatEditSelector({
  onSelect,
  onCancel,
}: {
  onSelect: (mode: RepeatEditMode) => void
  onCancel: () => void
}) {
  return (
    <div className="flex flex-col gap-4 py-2">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
          <RefreshCw className="w-5 h-5 text-primary" />
        </div>
        <div>
          <p className="font-semibold text-foreground">반복 일정 수정</p>
          <p className="text-sm text-muted-foreground">어느 범위를 수정할까요?</p>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <button
          onClick={() => onSelect('this')}
          className="w-full text-left px-4 py-3 rounded-xl border border-border hover:bg-accent/50 transition-colors"
        >
          <p className="font-medium text-sm">이 일정만</p>
          <p className="text-xs text-muted-foreground mt-0.5">선택한 날짜의 일정만 수정해요</p>
        </button>
        <button
          onClick={() => onSelect('following')}
          className="w-full text-left px-4 py-3 rounded-xl border border-border hover:bg-accent/50 transition-colors"
        >
          <p className="font-medium text-sm">이후 일정 모두</p>
          <p className="text-xs text-muted-foreground mt-0.5">선택한 날짜 이후의 모든 반복을 수정해요</p>
        </button>
        <button
          onClick={() => onSelect('all')}
          className="w-full text-left px-4 py-3 rounded-xl border border-border hover:bg-accent/50 transition-colors"
        >
          <p className="font-medium text-sm">전체 반복 일정</p>
          <p className="text-xs text-muted-foreground mt-0.5">이 반복 일정 전체를 수정해요</p>
        </button>
      </div>

      <Button variant="ghost" onClick={onCancel} className="w-full">
        취소
      </Button>
    </div>
  )
}

export function ScheduleModal() {
  const { user } = useAuth()
  const {
    isScheduleModalOpen,
    scheduleModalMode,
    editingScheduleId,
    editingDate,
    defaultDate,
    closeScheduleModal,
  } = useUiStore()

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  // 반복 일정 수정 방식 선택 화면 표시 여부
  // null: 아직 선택 안 함 / 'this'|'following'|'all': 선택 완료
  const [repeatEditMode, setRepeatEditMode] = useState<RepeatEditMode | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)
  const openCountRef = useRef(0)
  const [formKey, setFormKey] = useState(0)

  useEffect(() => {
    if (isScheduleModalOpen) {
      openCountRef.current += 1
      setFormKey(openCountRef.current)
      setSaveError(null)
      setShowDeleteConfirm(false)
      setRepeatEditMode(null)
    }
  }, [isScheduleModalOpen])

  const { data: schedules } = useSchedules(user?.uid ?? null)
  const createSchedule      = useCreateSchedule(user?.uid ?? '')
  const updateSchedule      = useUpdateSchedule(user?.uid ?? '')
  const updateRepeat        = useUpdateRepeatSchedule(user?.uid ?? '')
  const deleteSchedule      = useDeleteSchedule(user?.uid ?? '')

  const editingSchedule = editingScheduleId
    ? schedules?.find((s) => s.id === editingScheduleId)
    : null

  // 반복 일정을 편집 중이고 아직 수정 방식을 선택하지 않은 상태
  const isRepeatEditPending =
    scheduleModalMode === 'edit' &&
    editingSchedule?.repeat.enabled &&
    repeatEditMode === null

  // 편집 모드일 때 Timestamp → Date 변환
  const defaultValues: Partial<ScheduleFormValues> | undefined = editingSchedule
    ? {
        title:       editingSchedule.title,
        description: editingSchedule.description,
        startAt: editingDate
          // 반복 인스턴스 수정: 클릭한 날짜로 시작 시각 대체 (시/분은 원본 유지)
          ? (() => {
              const orig = (editingSchedule.startAt as Timestamp).toDate()
              const d = new Date(editingDate)
              d.setHours(orig.getHours(), orig.getMinutes(), 0, 0)
              return d
            })()
          : (editingSchedule.startAt as Timestamp).toDate(),
        endAt: editingDate
          ? (() => {
              const origStart = (editingSchedule.startAt as Timestamp).toDate()
              const origEnd   = (editingSchedule.endAt   as Timestamp).toDate()
              const duration  = origEnd.getTime() - origStart.getTime()
              const newStart  = new Date(editingDate)
              newStart.setHours(origStart.getHours(), origStart.getMinutes(), 0, 0)
              return new Date(newStart.getTime() + duration)
            })()
          : (editingSchedule.endAt as Timestamp).toDate(),
        isAllDay:  editingSchedule.isAllDay,
        priority:  editingSchedule.priority,
        color:     editingSchedule.color,
        repeat: {
          ...editingSchedule.repeat,
          daysOfWeek: editingSchedule.repeat.daysOfWeek ?? undefined,
          endCount:   editingSchedule.repeat.endCount   ?? undefined,
          endDate: editingSchedule.repeat.endDate
            ? (editingSchedule.repeat.endDate as Timestamp).toDate()
            : undefined,
        },
        notifications: {
          email:        editingSchedule.notifications.email,
          sms:          editingSchedule.notifications.sms,
          advanceTimes: editingSchedule.notifications.advanceTimes,
        },
      }
    : defaultDate
      ? { startAt: defaultDate, endAt: new Date(defaultDate.getTime() + 60 * 60 * 1000) }
      : undefined

  const handleSubmit = async (values: ScheduleFormValues) => {
    if (!user) return
    setSaveError(null)
    try {
      if (scheduleModalMode === 'create') {
        await createSchedule.mutateAsync(values)
      } else if (editingScheduleId) {
        if (editingSchedule?.repeat.enabled && repeatEditMode && editingDate) {
          // 반복 일정 수정 (선택한 모드로)
          await updateRepeat.mutateAsync({
            scheduleId:   editingScheduleId,
            instanceDate: editingDate,
            mode:         repeatEditMode,
            values,
          })
        } else {
          // 비반복 일정 수정
          await updateSchedule.mutateAsync({ scheduleId: editingScheduleId, values })
        }
      }
      closeScheduleModal()
    } catch {
      setSaveError('저장 중 오류가 발생했어요. 잠시 후 다시 시도해주세요.')
    }
  }

  const handleDelete = async () => {
    if (!user || !editingScheduleId) return
    try {
      await deleteSchedule.mutateAsync(editingScheduleId)
      setShowDeleteConfirm(false)
      closeScheduleModal()
    } catch {
      setSaveError('삭제 중 오류가 발생했어요. 잠시 후 다시 시도해주세요.')
      setShowDeleteConfirm(false)
    }
  }

  const handleClose = () => {
    setShowDeleteConfirm(false)
    setSaveError(null)
    setRepeatEditMode(null)
    closeScheduleModal()
  }

  const isLoading =
    createSchedule.isPending || updateSchedule.isPending ||
    updateRepeat.isPending    || deleteSchedule.isPending

  return (
    <Dialog
      open={isScheduleModalOpen}
      onOpenChange={() => {
        // Dialog dismiss 무시
      }}
    >
      <DialogContent className="w-[840px] max-w-[90vw] max-h-[90vh] overflow-y-auto" showCloseButton={false}>

        {/* 삭제 확인 화면 */}
        {showDeleteConfirm ? (
          <div className="flex flex-col items-center gap-5 py-4">
            <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-destructive" />
            </div>
            <div className="text-center">
              <p className="font-semibold text-foreground">일정을 삭제할까요?</p>
              <p className="text-sm text-muted-foreground mt-1">
                <span className="font-medium text-foreground">
                  {editingSchedule?.title}
                </span>
                이(가) 영구적으로 삭제돼요.
              </p>
            </div>
            <div className="flex gap-2 w-full">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setShowDeleteConfirm(false)}
                disabled={isLoading}
              >
                취소
              </Button>
              <Button
                variant="destructive"
                className="flex-1"
                onClick={handleDelete}
                disabled={isLoading}
              >
                {isLoading ? '삭제 중...' : '삭제'}
              </Button>
            </div>
          </div>

        ) : isRepeatEditPending ? (
          // 반복 일정 수정 방식 선택 화면
          <>
            <DialogHeader>
              <DialogTitle>일정 수정</DialogTitle>
            </DialogHeader>
            <RepeatEditSelector
              onSelect={(mode) => setRepeatEditMode(mode)}
              onCancel={handleClose}
            />
          </>

        ) : (
          <>
            <DialogHeader>
              <div className="flex items-center justify-between pr-8">
                <DialogTitle>
                  {scheduleModalMode === 'create' ? '새 일정' : '일정 수정'}
                </DialogTitle>
                <div className="flex items-center gap-2">
                  {scheduleModalMode === 'edit' && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="w-8 h-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                      onClick={() => setShowDeleteConfirm(true)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                  {/* DialogPrimitive.Close 대신 커스텀 close 버튼 */}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="w-8 h-8 text-muted-foreground hover:text-foreground"
                    onClick={handleClose}
                  >
                    ✕
                  </Button>
                </div>
              </div>
            </DialogHeader>

            {saveError && (
              <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-lg -mb-2">
                {saveError}
              </p>
            )}
            <ScheduleForm
              key={`${editingScheduleId ?? 'create'}-${formKey}`}
              userId={user?.uid ?? ''}
              defaultValues={defaultValues}
              onSubmit={handleSubmit}
              onCancel={handleClose}
              isLoading={isLoading}
            />
          </>
        )}

      </DialogContent>
    </Dialog>
  )
}
