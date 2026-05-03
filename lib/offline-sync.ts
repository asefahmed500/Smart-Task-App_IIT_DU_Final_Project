import { 
  updateTaskStatus, 
  createTask, 
  addComment, 
  updateTask 
} from '@/actions/task-actions'
import { OfflineAction } from '@/lib/offline-db'

export async function syncOfflineAction(action: OfflineAction) {
  try {
    let result
    switch (action.type) {
      case 'MOVE_TASK':
        result = await updateTaskStatus(action.payload)
        break
      case 'CREATE_TASK':
        result = await createTask(action.payload)
        break
      case 'ADD_COMMENT':
        result = await addComment(action.payload)
        break
      case 'UPDATE_TASK':
      case 'EDIT_TASK':
        result = await updateTask(action.payload)
        break
      default:
        console.warn(`Unknown action type: ${action.type}`)
        return { success: false, error: 'Unknown action type' }
    }

    return result
  } catch (error) {
    console.error(`Sync error for action ${action.id}:`, error)
    return { success: false, error: 'Network or server error during sync' }
  }
}
