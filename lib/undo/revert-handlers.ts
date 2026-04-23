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
    const { taskId, fromColumnId, fromPosition } = meta.arg

    if (!fromColumnId || fromPosition === undefined) {
      console.error('Cannot revert move: missing fromColumnId or fromPosition in meta.arg', meta.arg)
      return
    }

    await dispatch(
      tasksApi.endpoints.moveTask.initiate({
        taskId,
        targetColumnId: fromColumnId,
        newPosition: fromPosition,
        version: payload.version,
        isRevert: true,
      } as any)
    )
  }

  if (type.includes('task/updateTask')) {
    const { id } = meta.arg
    const previousData = meta.arg.previousState
    
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

  if (type.includes('task/assignTask')) {
    const { id } = meta.arg
    const previousAssigneeId = meta.arg.previousAssigneeId
    
    await dispatch(
      tasksApi.endpoints.assignTask.initiate({
        id,
        assigneeId: previousAssigneeId,
      } as any)
    )
  }

  if (type.includes('task/deleteTask')) {
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
    const taskId = payload.id
    await dispatch(tasksApi.endpoints.deleteTask.initiate(taskId))
  }

  // Board Reverts
  if (type.includes('boards/updateBoard')) {
    const { id } = meta.arg
    const previousData = meta.arg.data.previousState
    
    if (previousData) {
      await dispatch(
        boardsApi.endpoints.updateBoard.initiate({
          id,
          data: {
            ...previousData,
            isRevert: true,
          }
        } as any)
      )
    }
  }

  // Column Reverts
  if (type.includes('columns/updateColumn')) {
    const { id } = meta.arg
    const previousData = meta.arg.previousState
    
    if (previousData) {
      await dispatch(
        boardsApi.endpoints.updateColumn.initiate({
          id,
          ...previousData,
          isRevert: true,
        } as any)
      )
    }
  }

  if (type.includes('columns/createColumn')) {
    const columnId = payload.id
    await dispatch(boardsApi.endpoints.deleteColumn.initiate(columnId))
  }

  if (type.includes('columns/deleteColumn')) {
    const columnData = meta.arg.previousState
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
