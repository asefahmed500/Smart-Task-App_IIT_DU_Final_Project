import { tasksApi } from '@/lib/slices/tasksApi'
import { boardsApi } from '@/lib/slices/boardsApi'
import { AppDispatch } from '@/lib/store'

/**
 * Maps a successful mutation action to its inverse operation
 * and dispatches the corresponding API call.
 */
interface RevertibleAction {
  type: string
  payload: unknown
  meta: {
    arg: unknown
    isRevert?: boolean
  }
}

export async function revertAction(dispatch: AppDispatch, pastAction: unknown) {
  const { type, payload, meta } = pastAction as RevertibleAction

  if (type.includes('task/moveTask')) {
    const { taskId, fromColumnId, fromPosition } = meta.arg as { taskId: string; fromColumnId: string; fromPosition: number }

    if (!fromColumnId || fromPosition === undefined) {
      console.error('Cannot revert move: missing fromColumnId or fromPosition in meta.arg', meta.arg)
      return
    }

    await dispatch(
      tasksApi.endpoints.moveTask.initiate({
        taskId,
        targetColumnId: fromColumnId,
        newPosition: fromPosition,
        version: (payload as { version: number }).version,
        isRevert: true,
      })
    )
  }

  if (type.includes('task/updateTask')) {
    const { id, previousState: previousData } = meta.arg as { id: string; previousState: any }
    
    if (previousData) {
      await dispatch(
        tasksApi.endpoints.updateTask.initiate({
          id,
          data: {
            ...previousData,
            isRevert: true,
          }
        })
      )
    }
  }

  if (type.includes('task/assignTask')) {
    const { id, previousAssigneeId } = meta.arg as { id: string; previousAssigneeId: string | null }
    
    await dispatch(
      tasksApi.endpoints.assignTask.initiate({
        id,
        assigneeId: previousAssigneeId,
      })
    )
  }

  if (type.includes('task/deleteTask')) {
    const taskData = payload as any
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
    const taskId = (payload as { id: string }).id
    await dispatch(tasksApi.endpoints.deleteTask.initiate(taskId))
  }

  // Board Reverts
  if (type.includes('boards/updateBoard')) {
    const { id, data } = meta.arg as { id: string; data: { previousState: any } }
    const previousData = data.previousState
    
    if (previousData) {
      await dispatch(
        boardsApi.endpoints.updateBoard.initiate({
          id,
          data: {
            ...previousData,
            isRevert: true,
          }
        })
      )
    }
  }

  // Column Reverts
  if (type.includes('columns/updateColumn')) {
    const { id, previousState: previousData } = meta.arg as { id: string; previousState: any }
    
    if (previousData) {
      await dispatch(
        boardsApi.endpoints.updateColumn.initiate({
          id,
          ...previousData,
          isRevert: true,
        })
      )
    }
  }

  if (type.includes('columns/createColumn')) {
    const columnId = (payload as { id: string }).id
    await dispatch(boardsApi.endpoints.deleteColumn.initiate(columnId))
  }

  if (type.includes('columns/deleteColumn')) {
    const columnData = (meta.arg as { previousState: any }).previousState
    if (columnData) {
      await dispatch(
        boardsApi.endpoints.createColumn.initiate({
          boardId: columnData.boardId,
          name: columnData.name,
          wipLimit: columnData.wipLimit,
        })
      )
    }
  }
}
