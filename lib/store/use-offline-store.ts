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
      const target =
        state.queue.find((a) => a.id === id) ||
        state.failedActions.find((a) => a.id === id)
      if (!target) return state
      const updated = { ...target, ...updates }
      const isFailed = (updated.retryCount ?? 0) >= 3

      // Move the action between the pending and failed lists instead of
      // rebuilding `failedActions` from scratch (which silently dropped any
      // previously-failed actions).
      const queue = isFailed
        ? state.queue.filter((a) => a.id !== id)
        : state.queue.some((a) => a.id === id)
          ? state.queue.map((a) => (a.id === id ? updated : a))
          : [...state.queue, updated]

      const failedActions = isFailed
        ? state.failedActions.some((a) => a.id === id)
          ? state.failedActions.map((a) => (a.id === id ? updated : a))
          : [...state.failedActions, updated]
        : state.failedActions.filter((a) => a.id !== id)

      return { queue, failedActions }
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
