import { create } from 'zustand'

type Page = 'dashboard' | 'organizations' | 'events' | 'sessions' | 'queue' | 'gallery' | 'templates' | 'devices' | 'audit' | 'users'

interface AppState {
  currentPage: Page
  setCurrentPage: (page: Page) => void
  sidebarOpen: boolean
  setSidebarOpen: (open: boolean) => void
  selectedEventId: string | null
  setSelectedEventId: (id: string | null) => void
}

export const useAppStore = create<AppState>((set) => ({
  currentPage: 'dashboard',
  setCurrentPage: (page) => set({ currentPage: page }),
  sidebarOpen: true,
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  selectedEventId: null,
  setSelectedEventId: (id) => set({ selectedEventId: id }),
}))

export type { Page }
