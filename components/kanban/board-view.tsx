'use client'

import { useAppSelector } from '@/lib/hooks'
import { useGetBoardQuery, useGetBoardColumnsQuery } from '@/lib/slices/boardsApi'
import { useGetTasksQuery } from '@/lib/slices/tasksApi'
import { useGetSessionQuery } from '@/lib/slices/authApi'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import Column from './column'
import SwimlaneView from './swimlane-view'
import DraggableTaskCard from './draggable-task-card'
import MetricsDashboard from './metrics-dashboard'
import { DndContext, DragEndEvent, DragOverEvent, DragStartEvent, PointerSensor, useSensor, useSensors, closestCenter } from '@dnd-kit/core'
import { useMoveTaskMutation } from '@/lib/slices/tasksApi'
import { toast } from 'sonner'
import { useState } from 'react'
import { useDispatch } from 'react-redux'
import { setSelectedTask, setViewMode } from '@/lib/slices/uiSlice'
import { ConflictResolutionDialog } from './conflict-resolution-dialog'
import BoardSettingsDialog from '../board/board-settings-dialog'
import { LayoutGrid, Users, BarChart3, Settings, Filter, Layers } from 'lucide-react'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'

interface BoardViewProps {
  boardId: string
}

export default function BoardView({ boardId }: BoardViewProps) {
  const dispatch = useDispatch()

  const { data: board, isLoading: boardLoading } = useGetBoardQuery(boardId)
  const { data: columns, isLoading: columnsLoading } = useGetBoardColumnsQuery(boardId)
  const { data: tasks, isLoading: tasksLoading } = useGetTasksQuery(boardId)
  const [moveTask] = useMoveTaskMutation()

  const viewMode = useAppSelector((state) => state.ui.viewMode)
  const focusMode = useAppSelector((state) => state.ui.focusMode)
  const filterAssignee = useAppSelector((state) => state.ui.filterAssignee)
  const { data: session } = useGetSessionQuery()
  const [activeId, setActiveId] = useState<string | null>(null)
  
  // State
  const [conflictOpen, setConflictOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [pendingMove, setPendingMove] = useState<{ taskId: string, targetColumnId: string, version: number } | null>(null)
  const [swimlaneGroupBy, setSwimlaneGroupBy] = useState<'assignee' | 'priority' | 'label'>('assignee')

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  )

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string)
  }

  const handleDragOver = (event: DragOverEvent) => {
    // Handle drag over for column highlighting
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    setActiveId(null)

    if (!over) return

    const taskId = active.id as string
    const targetColumnId = over.id as string

    // Find the current task to get its version
    const currentTask = tasks?.find((t: { id: string }) => t.id === taskId)
    if (!currentTask) return

    // If moving to same column, just reorder (TODO: implement reordering)
    if (currentTask.columnId === targetColumnId) {
      toast('Reordering inside column not yet fully implemented', { icon: '🚧' })
      return
    }

    await performMove(taskId, targetColumnId, currentTask.version)
  }

  const handleSync = () => {
    setConflictOpen(false)
  }

  const handleForceOverwrite = () => {
    if (pendingMove) {
      performMove(pendingMove.taskId, pendingMove.targetColumnId, pendingMove.version, true)
      setConflictOpen(false)
    }
  }

  const performMove = async (taskId: string, targetColumnId: string, version: number, override: boolean = false) => {
    try {
      await moveTask({
        taskId,
        targetColumnId,
        newPosition: 0, // TODO: calculate proper position
        version,
        override,
      }).unwrap()
      toast.success(override ? 'WIP Limit Overridden' : 'Task moved successfully')
    } catch (error: any) {
      if (error?.data?.error === 'WIP limit exceeded') {
        if (error.data.requiresOverride) {
          toast.error(`WIP limit exceeded: ${error.data.wipLimit} tasks max`, {
            description: `Current count: ${error.data.currentCount}. You are a Manager.`,
            action: {
              label: 'Force Override',
              onClick: () => performMove(taskId, targetColumnId, version, true),
            },
            duration: 10000,
          })
        } else {
          toast.error(`WIP limit exceeded: ${error.data.wipLimit} tasks max`, {
            description: `Current count: ${error.data.currentCount}`,
          })
        }
      } else if (error?.data?.error === 'Version conflict') {
        setPendingMove({ taskId, targetColumnId, version })
        setConflictOpen(true)
      } else {
        toast.error('Failed to move task')
      }
    }
  }

  if (boardLoading || columnsLoading || tasksLoading) {
    return (
      <div className="flex gap-4 h-full">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="w-80 flex-shrink-0">
            <Skeleton className="h-8 w-24 mb-4" />
            <div className="space-y-2">
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-32 w-full" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (!board || !columns) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">Board not found</p>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      {/* Board Header */}
      <div className="mb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div
              className="w-4 h-4 rounded-full"
              style={{ backgroundColor: board.color }}
            />
            <h1 className="text-2xl font-bold">{board.name}</h1>
          </div>
          {board.description && (
            <p className="text-muted-foreground text-sm max-w-2xl">{board.description}</p>
          )}
        </div>

        <div className="flex items-center gap-3">
          {/* View Toggles */}
          <Tabs value={viewMode} onValueChange={(v) => dispatch(setViewMode(v as any))}>
            <TabsList className="bg-[rgba(0,0,0,0.04)] p-1 h-9">
              <TabsTrigger value="board" className="h-7 text-xs gap-1.5">
                <LayoutGrid className="h-3.5 w-3.5" />
                Board
              </TabsTrigger>
              <TabsTrigger value="swimlane" className="h-7 text-xs gap-1.5">
                <Layers className="h-3.5 w-3.5" />
                Swimlane
              </TabsTrigger>
              <TabsTrigger value="metrics" className="h-7 text-xs gap-1.5">
                <BarChart3 className="h-3.5 w-3.5" />
                Metrics
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Swimlane Specific GroupBy Control */}
          {viewMode === 'swimlane' && (
            <Select value={swimlaneGroupBy} onValueChange={(v) => setSwimlaneGroupBy(v as any)}>
              <SelectTrigger className="w-[140px] h-9 text-xs">
                <Filter className="h-3.5 w-3.5 mr-2" />
                <SelectValue placeholder="Group by..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="assignee">By Assignee</SelectItem>
                <SelectItem value="priority">By Priority</SelectItem>
                <SelectItem value="label">By Label</SelectItem>
              </SelectContent>
            </Select>
          )}

          {/* Board Settings - Managers/Admins only */}
          {(session?.role === 'ADMIN' || session?.role === 'MANAGER') && (
            <Button 
              variant="outline" 
              size="icon" 
              className="h-9 w-9 rounded-full"
              onClick={() => setSettingsOpen(true)}
            >
              <Settings className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Main Content Area based on viewMode */}
      {viewMode === 'board' && (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
          <ScrollArea className="flex-1">
            <div className="flex gap-4 pb-4 h-full min-w-max">
              {columns.map((column) => (
                <Column
                  key={column.id}
                  column={column}
                  boardId={boardId}
                  tasks={tasks?.filter((t: { columnId: string }) => t.columnId === column.id) || []}
                  focusMode={focusMode}
                  filterAssignee={filterAssignee}
                  activeId={activeId}
                />
              ))}
            </div>
          </ScrollArea>
        </DndContext>
      )}

      {viewMode === 'swimlane' && (
        <SwimlaneView
          columns={columns}
          tasks={tasks || []}
          groupBy={swimlaneGroupBy}
          renderTaskCard={(task) => (
            <DraggableTaskCard
              key={task.id}
              task={task}
              focusMode={focusMode}
              filterAssignee={filterAssignee}
              onClick={() => dispatch(setSelectedTask(task.id))}
            />
          )}
        />
      )}

      {viewMode === 'metrics' && (
        <MetricsDashboard boardId={boardId} />
      )}

      <ConflictResolutionDialog 
        open={conflictOpen}
        onOpenChange={setConflictOpen}
        onSync={handleSync}
        onForceOverwrite={handleForceOverwrite}
        isManager={session?.role === 'MANAGER' || session?.role === 'ADMIN'}
      />

      {board && session && (
        <BoardSettingsDialog 
          board={board}
          open={settingsOpen}
          onOpenChange={setSettingsOpen}
          currentUserId={session.id}
        />
      )}
    </div>
  )
}
