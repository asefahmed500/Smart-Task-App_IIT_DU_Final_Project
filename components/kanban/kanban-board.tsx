'use client'

import { useMemo, useCallback } from 'react'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragOverEvent,
  DragEndEvent,
  defaultDropAnimationSideEffects,
  DropAnimation,
  rectIntersection,
} from '@dnd-kit/core'
import {
  SortableContext,
  horizontalListSortingStrategy,
} from '@dnd-kit/sortable'
import { createPortal } from 'react-dom'
import { ColumnContainer } from './column-container'
import { TaskCard } from './task-card'
import { Button } from '@/components/ui/button'
import { Plus, AlertTriangle, ShieldAlert } from 'lucide-react'
import { AddColumnDialog } from './add-column-dialog'
import { TaskDetailsDialog } from './task-details-dialog'
import { PresenceAvatars } from './presence-avatars'
import { ConflictDialog } from './conflict-dialog'
import { useKanbanBoard } from '@/hooks/use-kanban-board'

import { Board, Task, Column, User } from '@/types/kanban'

interface KanbanBoardProps {
  board: Board
  currentUser: User
}

export function KanbanBoard({ board: initialBoard, currentUser }: KanbanBoardProps) {
  const {
    board,
    activeColumn,
    activeTask,
    isAddColumnOpen,
    setIsAddColumnOpen,
    conflictModalOpen,
    setConflictModalOpen,
    selectedTaskId,
    setSelectedTaskId,
    presence,
    onDragStart,
    onDragOver,
    onDragEnd,
    handleRefresh,
    handleResolveConflict,
    handleUndo
  } = useKanbanBoard({ initialBoard, currentUser })

  const columnsId = useMemo(() => board.columns.map((col: Column) => col.id), [board.columns])

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    })
  )

  const dropAnimation: DropAnimation = {
    sideEffects: defaultDropAnimationSideEffects({
      styles: {
        active: {
          opacity: '0.5',
        },
      },
    }),
  }

  const handleCloseTaskDetails = useCallback(() => {
    setSelectedTaskId(null)
  }, [])

  return (
    <>
      <div className="flex h-full w-full overflow-x-auto overflow-y-hidden pb-4 scrollbar-thin scrollbar-thumb-primary/10 scrollbar-track-transparent">
        <DndContext
          sensors={sensors}
          collisionDetection={rectIntersection}
          onDragStart={onDragStart}
          onDragOver={onDragOver}
          onDragEnd={onDragEnd}
        >
          <div className="flex flex-col gap-4 min-w-full">
            {/* WIP Status Summary */}
            <div className="flex items-center gap-3 px-1">
              {board.columns.some(col => col.wipLimit > 0 && col.tasks.length > col.wipLimit) ? (
                <div className="flex items-center gap-2 text-xs font-medium text-red-500 bg-red-500/10 px-3 py-1.5 rounded-full border border-red-500/20 animate-pulse">
                  <ShieldAlert className="size-3.5" />
                  WIP Limit Violation Detected
                </div>
              ) : board.columns.some(col => col.wipLimit > 0 && col.tasks.length === col.wipLimit) ? (
                <div className="flex items-center gap-2 text-xs font-medium text-yellow-600 bg-yellow-500/10 px-3 py-1.5 rounded-full border border-yellow-500/20">
                  <AlertTriangle className="size-3.5" />
                  Some columns are at capacity
                </div>
              ) : (
                <div className="flex items-center gap-2 text-xs font-medium text-emerald-500 bg-emerald-500/10 px-3 py-1.5 rounded-full border border-emerald-500/20">
                  <div className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Flow is within limits
                </div>
              )}
            </div>

            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">Active Now</span>
                <PresenceAvatars users={presence} />
              </div>
              
              <div className="flex items-center gap-2">
                {/* Stats or other tools could go here */}
              </div>
            </div>

            <div className="flex gap-6 h-full min-w-full">
            <SortableContext items={columnsId} strategy={horizontalListSortingStrategy}>
              {board.columns.map((col: Column) => (
                <ColumnContainer 
                  key={col.id} 
                  column={col} 
                  tasks={col.tasks} 
                  currentUser={currentUser}
                  boardId={board.id}
                  onTaskClick={(id) => setSelectedTaskId(id)}
                />
              ))}
            </SortableContext>

            {currentUser.role !== 'MEMBER' && (
              <div className="min-w-[300px] h-full">
                <Button
                  variant="outline"
                  className="w-full h-14 border-dashed border-primary/20 bg-primary/5 hover:bg-primary/10 hover:border-primary/40 transition-all font-oswald uppercase tracking-wider gap-2 rounded-xl"
                  onClick={() => setIsAddColumnOpen(true)}
                >
                  <Plus className="size-4" />
                  Add Column
                </Button>
              </div>
            )}
          </div>
        </div>

          <AddColumnDialog
            isOpen={isAddColumnOpen}
            onClose={() => setIsAddColumnOpen(false)}
            boardId={board.id}
          />

          <TaskDetailsDialog
            taskId={selectedTaskId}
            isOpen={!!selectedTaskId}
            onClose={handleCloseTaskDetails}
            boardMembers={board.members}
            currentUser={currentUser}
          />

          {typeof document !== 'undefined' && createPortal(
            <DragOverlay dropAnimation={dropAnimation}>
              {activeColumn && (
                <ColumnContainer
                  column={activeColumn}
                  tasks={activeColumn.tasks}
                  currentUser={currentUser}
                  boardId={board.id}
                  onTaskClick={() => {}}
                />
              )}
              {activeTask && (
                <TaskCard task={activeTask} />
              )}
            </DragOverlay>,
            document.body
          )}
        </DndContext>
      </div>

          <ConflictDialog 
            isOpen={conflictModalOpen}
            onClose={() => setConflictModalOpen(false)}
            onRefresh={handleRefresh}
            onResolve={handleResolveConflict}
          />
    </>
  )
}