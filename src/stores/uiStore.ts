import { create } from 'zustand'
import type { ModalMode } from '@/types'

interface UiState {
  // 일정 모달
  isScheduleModalOpen: boolean
  scheduleModalMode: ModalMode
  editingScheduleId: string | null
  defaultDate: Date | null

  // 설정 모달
  isSettingsModalOpen: boolean

  // Actions
  openCreateModal: (defaultDate?: Date) => void
  openEditModal: (scheduleId: string) => void
  closeScheduleModal: () => void
  openSettingsModal: () => void
  closeSettingsModal: () => void
}

export const useUiStore = create<UiState>((set) => ({
  isScheduleModalOpen: false,
  scheduleModalMode: 'create',
  editingScheduleId: null,
  defaultDate: null,
  isSettingsModalOpen: false,

  openCreateModal: (defaultDate) =>
    set({
      isScheduleModalOpen: true,
      scheduleModalMode: 'create',
      editingScheduleId: null,
      defaultDate: defaultDate ?? null,
    }),

  openEditModal: (scheduleId) =>
    set({
      isScheduleModalOpen: true,
      scheduleModalMode: 'edit',
      editingScheduleId: scheduleId,
    }),

  closeScheduleModal: () =>
    set({
      isScheduleModalOpen: false,
      editingScheduleId: null,
      defaultDate: null,
    }),

  openSettingsModal: () => set({ isSettingsModalOpen: true }),
  closeSettingsModal: () => set({ isSettingsModalOpen: false }),
}))
