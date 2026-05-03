import { create } from 'zustand'
import { 
  getOfflineActions, 
  addOfflineAction, 
  deleteOfflineAction, 
  clearOfflineActions,
  OfflineAction 
} from '@/lib/offline-db'

interface OfflineState {
  queue: OfflineAction[]
  isOnline: boolean
  initQueue: () => Promise<void>
  addAction: (action: Omit<OfflineAction, 'id' | 'timestamp'>) => Promise<void>
  removeAction: (id: string) => Promise<void>
  clearQueue: () => Promise<void>
  setOnline: (status: boolean) => void
}

export const useOfflineStore = create<OfflineState>((set, get) => ({
  queue: [],
  isOnline: typeof window !== 'undefined' ? window.navigator.onLine : true,
  
  initQueue: async () => {
    const actions = await getOfflineActions()
    set({ queue: actions })
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

  clearQueue: async () => {
    await clearOfflineActions()
    set({ queue: [] })
  },

  setOnline: (status) => set({ isOnline: status }),
}))
