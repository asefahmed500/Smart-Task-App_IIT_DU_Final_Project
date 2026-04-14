// Priority colors (consistent across app)
export const PRIORITY_COLORS = {
  LOW: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  MEDIUM: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
  HIGH: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
  CRITICAL: 'bg-red-500/10 text-red-500 border-red-500/20',
} as const

// Role colors
export const ROLE_COLORS = {
  ADMIN: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
  MANAGER: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  MEMBER: 'bg-gray-500/10 text-gray-500 border-gray-500/20',
} as const

// Role labels
export const ROLE_LABELS = {
  ADMIN: 'Administrator',
  MANAGER: 'Team Manager',
  MEMBER: 'Team Member',
} as const

// Dashboard stat card colors
export const STAT_COLORS = {
  blue: { icon: 'text-blue-500', bg: 'bg-blue-500/10' },
  purple: { icon: 'text-purple-500', bg: 'bg-purple-500/10' },
  green: { icon: 'text-green-500', bg: 'bg-green-500/10' },
  orange: { icon: 'text-orange-500', bg: 'bg-orange-500/10' },
  red: { icon: 'text-red-500', bg: 'bg-red-500/10' },
  gray: { icon: 'text-gray-500', bg: 'bg-gray-500/10' },
} as const

// Priority labels
export const PRIORITY_LABELS = {
  LOW: 'Low',
  MEDIUM: 'Medium',
  HIGH: 'High',
  CRITICAL: 'Critical',
} as const

// Task status labels
export const TASK_STATUS_LABELS = {
  todo: 'To Do',
  in_progress: 'In Progress',
  done: 'Done',
} as const
