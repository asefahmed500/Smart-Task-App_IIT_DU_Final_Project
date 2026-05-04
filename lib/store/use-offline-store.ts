import { create } from "zustand"
import {
  getOfflineActions,
  addOfflineAction,
  deleteOfflineAction,
  clearOfflineActions,
  updateOfflineAction,
  OfflineAction,
} from "@/lib/offline-db"

interface OfflineState {
  queue: OfflineAction[]
  failedActions: OfflineAction[]
  isOnline: boolean
  initQueue: () => Promise<void>
  addAction: (action: Omit<OfflineAction, "id" | "timestamp">) => Promise<void>
  removeAction: (id: string) => Promise<void>
  updateAction: (
    id: string,
    updates: Partial<Pick<OfflineAction, "retryCount" | "errorMsg">>
  ) => Promise<void>
  clearQueue: () => Promise<void>
  retryAction: (id: string) => Promise<void>
  dismissFailed: (id: string) => Promise<void>
  setOnline: (status: boolean) => void
}

export const useOfflineStore = create<OfflineState>((set, get) => ({
  queue: [],
  failedActions: [],
  isOnline: typeof window !== "undefined" ? window.navigator.onLine : true,

  initQueue: async () => {
    const actions = await getOfflineActions()
    set({
      queue: actions.filter((a) => (a.retryCount ?? 0) < 3),
      failedActions: actions.filter((a) => (a.retryCount ?? 0) >= 3),
    })
  },

  addAction: async (action) => {
    const newAction = await addOfflineAction(action)
    if (newAction) {
      set((state) => ({ queue: [...state.queue, newAction] }))
    }
  },

  removeAction: async (id) => {
    await deleteOfflineAction(id)
    set((state) => ({ queue: state.queue.filter((a) => a.id !== id) }))
  },

  updateAction: async (id, updates) => {
    await updateOfflineAction(id, updates)
    set((state) => {
      const queue = state.queue.map((a) =>
        a.id === id ? { ...a, ...updates } : a
      )
      const failed = queue.filter((a) => (a.retryCount ?? 0) >= 3)
      const pending = queue.filter((a) => (a.retryCount ?? 0) < 3)
      return { queue: pending, failedActions: failed }
    })
  },

  clearQueue: async () => {
    for (const action of get().queue) {
      await deleteOfflineAction(action.id)
    }
    for (const action of get().failedActions) {
      await deleteOfflineAction(action.id)
    }
    set({ queue: [], failedActions: [] })
  },

  retryAction: async (id) => {
    await updateOfflineAction(id, { retryCount: 0, errorMsg: undefined })
    const action = await getOfflineActions().then((actions) =>
      actions.find((a) => a.id === id)
    )
    if (action) {
      set((state) => ({
        queue: [...state.queue.filter((a) => a.id !== id), action],
        failedActions: state.failedActions.filter((a) => a.id !== id),
      }))
    }
  },

  dismissFailed: async (id) => {
    await deleteOfflineAction(id)
    set((state) => ({
      failedActions: state.failedActions.filter((a) => a.id !== id),
    }))
  },

  setOnline: (status) => set({ isOnline: status }),
}))
