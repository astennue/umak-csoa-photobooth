import { create } from 'zustand'

type Page = 'dashboard' | 'live-display' | 'virtual-background' | 'organizations' | 'events' | 'sessions' | 'queue' | 'gallery' | 'templates' | 'devices' | 'audit' | 'users' | 'settings'

interface AppState {
  currentPage: Page
  setCurrentPage: (page: Page) => void
  selectedEventId: string | null
  setSelectedEventId: (id: string | null) => void
  activeSession: { id: string; guestName: string; guestEmail: string | null; eventId: string; templateId: string | null } | null
  setActiveSession: (session: { id: string; guestName: string; guestEmail: string | null; eventId: string; templateId: string | null } | null) => void
  // Template selection — used to pass a chosen template from Templates page to Live Display
  selectedTemplateId: string | null
  setSelectedTemplateId: (id: string | null) => void
}

export const useAppStore = create<AppState>((set) => ({
  currentPage: 'dashboard',
  setCurrentPage: (page) => set({ currentPage: page }),
  selectedEventId: null,
  setSelectedEventId: (id) => set({ selectedEventId: id }),
  activeSession: null,
  setActiveSession: (session) => set({ activeSession: session }),
  selectedTemplateId: null,
  setSelectedTemplateId: (id) => set({ selectedTemplateId: id }),
}))

export type { Page }
