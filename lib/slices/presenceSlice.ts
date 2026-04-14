import { createSlice, PayloadAction } from '@reduxjs/toolkit'

export interface LiveUser {
  id: string
  name: string
  avatar?: string
  cursor?: { x: number; y: number }
  isEditing?: boolean
  editingTaskId?: string
}

export interface EditingUser {
  userId: string
  userName: string
  taskId: string
}

interface PresenceState {
  users: Record<string, LiveUser>
  usersEditing: EditingUser[]
  currentBoardId: string | null
  isOnline: boolean
  queuedActionCount: number
}

const initialState: PresenceState = {
  users: {},
  usersEditing: [],
  currentBoardId: null,
  isOnline: true,
  queuedActionCount: 0,
}

const presenceSlice = createSlice({
  name: 'presence',
  initialState,
  reducers: {
    setCurrentBoard: (state, action: PayloadAction<string | null>) => {
      state.currentBoardId = action.payload
      state.users = {}
      state.usersEditing = []
    },
    userJoined: (state, action: PayloadAction<LiveUser>) => {
      state.users[action.payload.id] = action.payload
    },
    userLeft: (state, action: PayloadAction<string>) => {
      const userId = action.payload
      delete state.users[userId]
      state.usersEditing = state.usersEditing.filter((u) => u.userId !== userId)
    },
    userCursorMoved: (state, action: PayloadAction<{ userId: string; cursor: { x: number; y: number } }>) => {
      const user = state.users[action.payload.userId]
      if (user) {
        user.cursor = action.payload.cursor
      }
    },
    userStartedEditing: (state, action: PayloadAction<{ userId: string; taskId: string }>) => {
      const user = state.users[action.payload.userId]
      if (user) {
        user.isEditing = true
        user.editingTaskId = action.payload.taskId
        // Add to usersEditing if not already there
        const existing = state.usersEditing.findIndex((u) => u.userId === action.payload.userId)
        if (existing === -1) {
          state.usersEditing.push({
            userId: action.payload.userId,
            userName: user.name,
            taskId: action.payload.taskId,
          })
        } else {
          state.usersEditing[existing].taskId = action.payload.taskId
        }
      }
    },
    userStoppedEditing: (state, action: PayloadAction<string>) => {
      const userId = action.payload
      const user = state.users[userId]
      if (user) {
        user.isEditing = false
        user.editingTaskId = undefined
      }
      // Remove from usersEditing
      state.usersEditing = state.usersEditing.filter((u) => u.userId !== userId)
    },
    setOnlineStatus: (state, action: PayloadAction<boolean>) => {
      state.isOnline = action.payload
    },
    actionQueued: (state) => {
      state.queuedActionCount++
    },
    actionReplayed: (state) => {
      state.queuedActionCount = Math.max(0, state.queuedActionCount - 1)
    },
    clearQueueCount: (state) => {
      state.queuedActionCount = 0
    },
  },
})

export const {
  setCurrentBoard,
  userJoined,
  userLeft,
  userCursorMoved,
  userStartedEditing,
  userStoppedEditing,
  setOnlineStatus,
  actionQueued,
  actionReplayed,
  clearQueueCount,
} = presenceSlice.actions

export default presenceSlice.reducer


