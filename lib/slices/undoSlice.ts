'use client'

import { createSlice, PayloadAction } from '@reduxjs/toolkit'

interface UndoState {
  past: any[][]
  present: any
  future: any[][]
  maxSize: number
}

const initialState: UndoState = {
  past: [],
  present: null,
  future: [],
  maxSize: 20, // 20 steps as per PRD
}

export const undoSlice = createSlice({
  name: 'undo',
  initialState,
  reducers: {
    // Add a new state to history
    pushState: (state, action: PayloadAction<any>) => {
      // If we're not at the end of the history, discard the future
      if (state.future.length > 0) {
        state.future = []
      }

      // Push current present to past
      if (state.present !== null) {
        state.past.push([state.present])
      }

      // Set new present
      state.present = action.payload

      // Enforce max size (FIFO)
      if (state.past.length > state.maxSize) {
        state.past.shift()
      }
    },

    // Undo: move present to future, restore last past
    undo: (state) => {
      if (state.past.length === 0) return state

      // Push present to future
      state.future.unshift([state.present])

      // Pop from past to present
      const previous = state.past.pop()
      state.present = previous?.[0] || null
    },

    // Redo: move present to past, restore first future
    redo: (state) => {
      if (state.future.length === 0) return state

      // Push present to past
      if (state.present !== null) {
        state.past.push([state.present])
      }

      // Pop from future to present
      const next = state.future.shift()
      state.present = next?.[0] || null
    },

    // Clear history (e.g., after logout)
    clearHistory: (state) => {
      state.past = []
      state.present = null
      state.future = []
    },
  },
})

export const { pushState, undo, redo, clearHistory } = undoSlice.actions
export default undoSlice.reducer
