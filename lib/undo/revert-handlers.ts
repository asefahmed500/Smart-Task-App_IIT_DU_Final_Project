import { tasksApi } from '@/lib/slices/tasksApi'
import { boardsApi } from '@/lib/slices/boardsApi'
import { AppDispatch } from '@/lib/store'

/**
 * Maps a successful mutation action to its inverse operation
 * and dispatches the corresponding API call.
 */
export async function revertAction(dispatch: AppDispatch, pastAction: any) {
  const { type, payload, meta } = pastAction

  if (type.includes('task/moveTask')) {
    const { id } = meta.arg
    const { fromColumnId, fromPosition } = meta.arg // We need these in my arg!
    
    // Note: I need to ensure the moveTask thunk includes fromColumnId in its args
      await dispatch(
        tasksApi.endpoints.moveTask.initiate({
          taskId: id, // Corrected from 'id' to 'taskId' based on MoveTaskRequest
          targetColumnId: fromColumnId,
          newPosition: fromPosition,
          version: payload.version,
          isRevert: true, // Use this for middleware check
        } as any)
      )
  }

  if (type.includes('task/updateTask')) {
    const { id } = meta.arg
    const previousData = meta.arg.previousState // I should attach this in the middleware
    
    if (previousData) {
      await dispatch(
        tasksApi.endpoints.updateTask.initiate({
          id,
          data: {
            ...previousData,
            isRevert: true,
          }
        } as any)
      )
    }
  }

  if (type.includes('task/deleteTask')) {
    // RESTORE logic: Call create with the exact data that was deleted
    const taskData = payload
    await dispatch(
      tasksApi.endpoints.createTask.initiate({
        boardId: taskData.boardId,
        data: {
          columnId: taskData.columnId,
          title: taskData.title,
          description: taskData.description,
          priority: taskData.priority,
          assigneeId: taskData.assigneeId,
          dueDate: taskData.dueDate,
          labels: taskData.labels,
        }
      })
    )
  }

  if (type.includes('task/createTask')) {
    // UNDO create: Delete the task
    const taskId = payload.id
    await dispatch(tasksApi.endpoints.deleteTask.initiate(taskId))
  }
}
