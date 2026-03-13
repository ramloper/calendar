'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Trash2, AlertTriangle } from 'lucide-react'
import { useUiStore } from '@/stores/uiStore'
import { useAuth } from '@/hooks/useAuth'
import {
  useCreateSchedule,
  useUpdateSchedule,
  useDeleteSchedule,
  useSchedules,
} from '@/hooks/useSchedules'
import { ScheduleForm } from './ScheduleForm'
import type { ScheduleFormValues } from '@/types'
import { Timestamp } from 'firebase/firestore'

export function ScheduleModal() {
  const { user } = useAuth()
  const {
    isScheduleModalOpen,
    scheduleModalMode,
    editingScheduleId,
    defaultDate,
    closeScheduleModal,
  } = useUiStore()

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const { data: schedules } = useSchedules(user?.uid ?? null)
  const createSchedule = useCreateSchedule(user?.uid ?? '')
  const updateSchedule = useUpdateSchedule(user?.uid ?? '')
  const deleteSchedule = useDeleteSchedule(user?.uid ?? '')

  const editingSchedule = editingScheduleId
    ? schedules?.find((s) => s.id === editingScheduleId)
    : null

  // 편집 모드일 때 Timestamp → Date 변환
  const defaultValues: Partial<ScheduleFormValues> | undefined = editingSchedule
    ? {
        title: editingSchedule.title,
        description: editingSchedule.description,
        startAt: (editingSchedule.startAt as Timestamp).toDate(),
        endAt: (editingSchedule.endAt as Timestamp).toDate(),
        isAllDay: editingSchedule.isAllDay,
        priority: editingSchedule.priority,
        color: editingSchedule.color,
        repeat: {
          ...editingSchedule.repeat,
          endDate: editingSchedule.repeat.endDate
            ? (editingSchedule.repeat.endDate as Timestamp).toDate()
            : undefined,
        },
        notifications: {
          email: editingSchedule.notifications.email,
          sms: editingSchedule.notifications.sms,
          advanceTimes: editingSchedule.notifications.advanceTimes,
        },
      }
    : defaultDate
      ? { startAt: defaultDate, endAt: new Date(defaultDate.getTime() + 60 * 60 * 1000) }
      : undefined

  const handleSubmit = async (values: ScheduleFormValues) => {
    if (!user) return
    if (scheduleModalMode === 'create') {
      await createSchedule.mutateAsync(values)
    } else if (editingScheduleId) {
      await updateSchedule.mutateAsync({ scheduleId: editingScheduleId, values })
    }
    closeScheduleModal()
  }

  const handleDelete = async () => {
    if (!user || !editingScheduleId) return
    await deleteSchedule.mutateAsync(editingScheduleId)
    setShowDeleteConfirm(false)
    closeScheduleModal()
  }

  const handleClose = () => {
    setShowDeleteConfirm(false)
    closeScheduleModal()
  }

  const isLoading =
    createSchedule.isPending || updateSchedule.isPending || deleteSchedule.isPending

  return (
    <Dialog open={isScheduleModalOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="w-[840px] max-w-[90vw] max-h-[90vh] overflow-y-auto">

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
        ) : (
          <>
            <DialogHeader>
              <div className="flex items-center justify-between pr-8">
                <DialogTitle>
                  {scheduleModalMode === 'create' ? '새 일정' : '일정 수정'}
                </DialogTitle>
                {/* 수정 모드일 때만 삭제 버튼 표시 */}
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
              </div>
            </DialogHeader>

            <ScheduleForm
              key={editingScheduleId ?? `create-${defaultDate?.getTime() ?? 'empty'}`}
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
