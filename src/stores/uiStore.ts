import { create } from 'zustand'
import type { ModalMode } from '@/types'

type BottomTab = 'calendar' | 'schedule' | 'upcoming' | 'settings'

interface UiState {
  // 일정 모달
  isScheduleModalOpen: boolean
  scheduleModalMode: ModalMode
  editingScheduleId: string | null
  editingDate: Date | null        // 반복 일정 클릭 시 해당 인스턴스 날짜
  defaultDate: Date | null

  // 설정 모달
  isSettingsModalOpen: boolean

  // 모바일 네비게이션
  activeBottomTab: BottomTab
  isSidebarOpen: boolean
  isDayPanelOpen: boolean

  // Actions
  openCreateModal: (defaultDate?: Date) => void
  openEditModal: (scheduleId: string, instanceDate?: Date) => void
  closeScheduleModal: () => void
  openSettingsModal: () => void
  closeSettingsModal: () => void
  setActiveBottomTab: (tab: BottomTab) => void
  toggleSidebar: () => void
  setSidebarOpen: (open: boolean) => void
  setDayPanelOpen: (open: boolean) => void
}

export const useUiStore = create<UiState>((set) => ({
  isScheduleModalOpen: false,
  scheduleModalMode: 'create',
  editingScheduleId: null,
  editingDate: null,
  defaultDate: null,
  isSettingsModalOpen: false,

  // 모바일
  activeBottomTab: 'calendar',
  isSidebarOpen: false,
  isDayPanelOpen: false,

  openCreateModal: (defaultDate) =>
    set({
      isScheduleModalOpen: true,
      scheduleModalMode: 'create',
      editingScheduleId: null,
      editingDate: null,
      defaultDate: defaultDate ?? null,
    }),

  openEditModal: (scheduleId, instanceDate) =>
    set({
      isScheduleModalOpen: true,
      scheduleModalMode: 'edit',
      editingScheduleId: scheduleId,
      editingDate: instanceDate ?? null,
    }),

  closeScheduleModal: () =>
    set({
      isScheduleModalOpen: false,
      editingScheduleId: null,
      editingDate: null,
      defaultDate: null,
    }),

  openSettingsModal: () => set({ isSettingsModalOpen: true }),
  closeSettingsModal: () => set({ isSettingsModalOpen: false }),

  setActiveBottomTab: (tab) => set({ activeBottomTab: tab }),
  toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
  setSidebarOpen: (open) => set({ isSidebarOpen: open }),
  setDayPanelOpen: (open) => set({ isDayPanelOpen: open }),
}))
