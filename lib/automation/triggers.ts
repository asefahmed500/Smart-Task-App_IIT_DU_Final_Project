import { AutomationTrigger } from './engine'

// Whitelisted trigger types for security
export const ALLOWED_TRIGGER_TYPES = [
  'TASK_MOVED',
  'TASK_ASSIGNED',
  'PRIORITY_CHANGED',
  'TASK_STALLED',
] as const

/**
 * Execute a trigger check with security validation
 * @param trigger - The trigger configuration
 * @param eventType - The event type that occurred
 * @param taskData - The task data
 * @returns true if the trigger matches
 */
export async function executeTrigger(
  trigger: AutomationTrigger,
  eventType: string,
  taskData: any
): Promise<boolean> {
  const { type, value } = trigger

  // Security: Validate trigger type against whitelist
  if (!ALLOWED_TRIGGER_TYPES.includes(type as any)) {
    console.error(`[Security] Invalid automation trigger type: ${type}`)
    return false
  }

  // First check if the event type matches the trigger type
  const eventTypeMatch = mapEventTypeToTriggerType(eventType)
  if (eventTypeMatch !== type) {
    return false
  }

  // Then check if the value matches (if specified)
  switch (type) {
    case 'TASK_MOVED':
      // value would be the target column ID
      return !value || taskData.columnId === value

    case 'TASK_ASSIGNED':
      // value would be the user ID being assigned to
      return !value || taskData.assigneeId === value

    case 'PRIORITY_CHANGED':
      // value would be the priority level
      return !value || taskData.priority === value

    case 'TASK_STALLED':
      // value would be the number of days
      if (taskData.lastMovedAt) {
        const daysSince = Math.floor((Date.now() - new Date(taskData.lastMovedAt).getTime()) / (1000 * 60 * 60 * 24))
        return !value || daysSince >= Number(value)
      }
      return false

    default:
      // Security: Default to false for unknown types
      return false
  }
}

/**
 * Map event type strings to trigger type enum values
 */
function mapEventTypeToTriggerType(eventType: string): AutomationTrigger['type'] | null {
  // Security: Only return whitelisted types
  switch (eventType) {
    case 'TASK_MOVED':
      return 'TASK_MOVED'
    case 'TASK_ASSIGNED':
      return 'TASK_ASSIGNED'
    case 'PRIORITY_CHANGED':
      return 'PRIORITY_CHANGED'
    case 'TASK_STALLED':
      return 'TASK_STALLED'
    default:
      console.warn(`[Security] Unknown event type in automation: ${eventType}`)
      return null
  }
}
