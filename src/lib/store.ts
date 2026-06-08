import { create } from 'zustand'

type Page = 'dashboard' | 'live-display' | 'virtual-background' | 'organizations' | 'events' | 'sessions' | 'queue' | 'gallery' | 'templates' | 'devices' | 'audit' | 'users'

interface AppState {
  currentPage: Page
  setCurrentPage: (page: Page) => void
  selectedEventId: string | null
  setSelectedEventId: (id: string | null) => void
  activeSession: { id: string; guestName: string; eventId: string } | null
  setActiveSession: (session: { id: string; guestName: string; eventId: string } | null) => void
}

export const useAppStore = create<AppState>((set) => ({
  currentPage: 'dashboard',
  setCurrentPage: (page) => set({ currentPage: page }),
  selectedEventId: null,
  setSelectedEventId: (id) => set({ selectedEventId: id }),
  activeSession: null,
  setActiveSession: (session) => set({ activeSession: session }),
}))

export type { Page }
