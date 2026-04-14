import { createSlice, PayloadAction } from '@reduxjs/toolkit'

type ViewMode = 'board' | 'swimlane' | 'metrics'

interface UIState {
  isOnline: boolean
  focusMode: boolean
  viewMode: ViewMode
  sidebarOpen: boolean
  rightSidebarOpen: boolean
  rightSidebarTab: 'overview' | 'comments' | 'dependencies' | 'attachments' | 'activity'
  selectedTaskId: string | null
  commandPaletteOpen: boolean
  theme: 'light' | 'dark' | 'system'
  filterAssignee: string | null
  filterDue: 'today' | 'overdue' | 'stale' | 'all'
  offlineQueue: Array<{ action: string; data: any; timestamp: number }>
}

const initialState: UIState = {
  isOnline: typeof window !== 'undefined' ? window.navigator.onLine : true,
  focusMode: false,
  viewMode: 'board',
  sidebarOpen: true,
  rightSidebarOpen: false,
  rightSidebarTab: 'overview',
  selectedTaskId: null,
  commandPaletteOpen: false,
  theme: 'system',
  filterAssignee: null,
  filterDue: 'all',
  offlineQueue: [],
}

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    setOnline: (state, action: PayloadAction<boolean>) => {
      state.isOnline = action.payload
    },
    toggleFocusMode: (state) => {
      state.focusMode = !state.focusMode
    },
    setFocusMode: (state, action: PayloadAction<boolean>) => {
      state.focusMode = action.payload
    },
    setViewMode: (state, action: PayloadAction<ViewMode>) => {
      state.viewMode = action.payload
    },
    toggleSidebar: (state) => {
      state.sidebarOpen = !state.sidebarOpen
    },
    setSidebarOpen: (state, action: PayloadAction<boolean>) => {
      state.sidebarOpen = action.payload
    },
    toggleRightSidebar: (state) => {
      state.rightSidebarOpen = !state.rightSidebarOpen
    },
    setRightSidebarOpen: (state, action: PayloadAction<boolean>) => {
      state.rightSidebarOpen = action.payload
    },
    setRightSidebarTab: (state, action: PayloadAction<'overview' | 'comments' | 'dependencies' | 'attachments' | 'activity'>) => {
      state.rightSidebarTab = action.payload
    },
    setSelectedTask: (state, action: PayloadAction<string | null>) => {
      state.selectedTaskId = action.payload
      state.rightSidebarOpen = action.payload !== null
    },
    toggleCommandPalette: (state) => {
      state.commandPaletteOpen = !state.commandPaletteOpen
    },
    setCommandPaletteOpen: (state, action: PayloadAction<boolean>) => {
      state.commandPaletteOpen = action.payload
    },
    setTheme: (state, action: PayloadAction<'light' | 'dark' | 'system'>) => {
      state.theme = action.payload
    },
    setFilterAssignee: (state, action: PayloadAction<string | null>) => {
      state.filterAssignee = action.payload
    },
    setFilterDue: (state, action: PayloadAction<'today' | 'overdue' | 'stale' | 'all'>) => {
      state.filterDue = action.payload
    },
    addToOfflineQueue: (state, action: PayloadAction<{ action: string; data: any }>) => {
      state.offlineQueue.push({
        ...action.payload,
        timestamp: Date.now(),
      })
    },
    removeFromOfflineQueue: (state, action: PayloadAction<number>) => {
      state.offlineQueue.splice(action.payload, 1)
    },
    clearOfflineQueue: (state) => {
      state.offlineQueue = []
    },
  },
})

export const {
  setOnline,
  toggleFocusMode,
  setFocusMode,
  setViewMode,
  toggleSidebar,
  setSidebarOpen,
  toggleRightSidebar,
  setRightSidebarOpen,
  setRightSidebarTab,
  setSelectedTask,
  toggleCommandPalette,
  setCommandPaletteOpen,
  setTheme,
  setFilterAssignee,
  setFilterDue,
  addToOfflineQueue,
  removeFromOfflineQueue,
  clearOfflineQueue,
} = uiSlice.actions

export default uiSlice.reducer
