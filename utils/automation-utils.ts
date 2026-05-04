export function getAvailableTriggers(): { value: string; label: string }[] {
  return [
    { value: 'TASK_CREATED', label: 'When a task is created' },
    { value: 'TASK_MOVED', label: 'When a task is moved to a column' },
    { value: 'TASK_UPDATED', label: 'When a task is updated' },
    { value: 'TASK_ASSIGNED', label: 'When a task is assigned to someone' },
  ]
}

export function getAvailableConditions(): { value: string; label: string }[] {
  return [
    { value: 'none', label: 'No condition (always run)' },
    { value: 'priority=HIGH', label: 'Priority is High' },
    { value: 'priority=URGENT', label: 'Priority is Urgent' },
    { value: 'priority=MEDIUM', label: 'Priority is Medium' },
    { value: 'priority=LOW', label: 'Priority is Low' },
    { value: 'assignee=null', label: 'Task is unassigned' },
    { value: 'assignee!=null', label: 'Task has assignee' },
    { value: 'column=In Progress', label: 'Moved to In Progress' },
    { value: 'column=Done', label: 'Moved to Done' },
    { value: 'column=To Do', label: 'Moved to To Do' },
  ]
}

export function getAvailableActions(): { value: string; label: string }[] {
  return [
    { value: 'SEND_NOTIFICATION:manager', label: 'Notify Manager' },
    { value: 'SEND_NOTIFICATION:assignee', label: 'Notify Assignee' },
    { value: 'SEND_NOTIFICATION:creator', label: 'Notify Creator' },
    { value: 'SET_PRIORITY:HIGH', label: 'Set Priority to High' },
    { value: 'SET_PRIORITY:MEDIUM', label: 'Set Priority to Medium' },
    { value: 'SET_PRIORITY:LOW', label: 'Set Priority to Low' },
    { value: 'MOVE_TASK:column:Done', label: 'Move Task to Done' },
    { value: 'MOVE_TASK:column:In Progress', label: 'Move Task to In Progress' },
    { value: 'MOVE_TASK:column:To Do', label: 'Move Task to To Do' },
    { value: 'ADD_TAG:tag:urgent', label: 'Add Urgent Tag' },
    { value: 'ADD_TAG:tag:review', label: 'Add Review Tag' },
    { value: 'ADD_TAG:tag:bug', label: 'Add Bug Tag' },
  ]
}