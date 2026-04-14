import { createSlice, PayloadAction } from '@reduxjs/toolkit'

export type Role = 'ADMIN' | 'MANAGER' | 'MEMBER'

interface RoleState {
  currentRole: Role
  permissions: string[]
}

const initialState: RoleState = {
  currentRole: 'MEMBER',
  permissions: [],
}

const roleSlice = createSlice({
  name: 'role',
  initialState,
  reducers: {
    setRole: (state, action: PayloadAction<Role>) => {
      state.currentRole = action.payload
      state.permissions = getPermissionsForRole(action.payload)
    },
    clearRole: (state) => {
      state.currentRole = 'MEMBER'
      state.permissions = []
    },
  },
})

function getPermissionsForRole(role: Role): string[] {
  switch (role) {
    case 'ADMIN':
      return [
        'create:user',
        'update:user',
        'delete:user',
        'update:role',
        'create:board',
        'update:board',
        'delete:board',
        'create:column',
        'update:column',
        'delete:column',
        'create:task',
        'update:task',
        'delete:task',
        'assign:any',
        'override:wip',
        'view:metrics',
        'view:audit:all',
      ]
    case 'MANAGER':
      return [
        'create:board',
        'update:board',
        'delete:board',
        'create:column',
        'update:column',
        'delete:column',
        'create:task',
        'update:task',
        'delete:task',
        'assign:any',
        'override:wip',
        'view:metrics',
        'view:audit:board',
      ]
    case 'MEMBER':
      return [
        'create:task',
        'update:task',
        'assign:self',
        'view:metrics:personal',
        'view:audit:own',
      ]
    default:
      return []
  }
}

export const { setRole, clearRole } = roleSlice.actions
export default roleSlice.reducer
