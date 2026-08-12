import { create } from "zustand"

interface GlobalLoadingState {
  active: number
  message: string | null
  start: (message?: string) => void
  stop: () => void
}

export const useGlobalLoading = create<GlobalLoadingState>((set, get) => ({
  active: 0,
  message: null,
  start: (message) =>
    set((state) => ({ active: state.active + 1, message: message ?? state.message ?? null })),
  stop: () => {
    const next = Math.max(0, get().active - 1)
    set({ active: next, message: next === 0 ? null : get().message })
  },
}))
