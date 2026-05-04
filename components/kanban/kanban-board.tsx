'use client'

import { useMemo, useCallback, useState } from 'react'
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
import { Plus, AlertTriangle, ShieldAlert, Search, X, Tag as TagIcon } from 'lucide-react'
import { AddColumnDialog } from './add-column-dialog'
import { TaskDetailsDialog } from './task-details-dialog'
import { PresenceAvatars } from './presence-avatars'
import { ConflictDialog } from './conflict-dialog'
import { useKanbanBoard } from '@/hooks/use-kanban-board'

import { Board, Task, Column, User, Tag } from '@/types/kanban'

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
    isConnected,
    presence,
    editingTasks,
    onDragStart,
    onDragOver,
    onDragEnd,
    handleRefresh,
    handleResolveConflict,
    handleUndo
  } = useKanbanBoard({ initialBoard, currentUser })

  const [searchQuery, setSearchQuery] = useState('')
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([])

  const allTags = useMemo(() => {
    const tagMap = new Map<string, Tag>()
    board.columns.forEach((col) => {
      col.tasks.forEach((task) => {
        task.tags?.forEach((tag) => {
          if (!tagMap.has(tag.id)) tagMap.set(tag.id, tag)
        })
      })
    })
    return Array.from(tagMap.values())
  }, [board.columns])

  const filteredColumns = useMemo(() => {
    return board.columns.map((col) => ({
      ...col,
      tasks: col.tasks.filter((task) => {
        const matchesSearch =
          !searchQuery ||
          task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (task.description?.toLowerCase() || '').includes(
            searchQuery.toLowerCase()
          )
        const matchesTags =
          selectedTagIds.length === 0 ||
          task.tags?.some((t) => selectedTagIds.includes(t.id))
        return matchesSearch && matchesTags
      }),
    }))
  }, [board.columns, searchQuery, selectedTagIds])

  const columnsId = useMemo(
    () => filteredColumns.map((col: Column) => col.id),
    [filteredColumns]
  )

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
                <div
                  className={`flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full border ${
                    isConnected
                      ? 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20'
                      : 'text-red-500 bg-red-500/10 border-red-500/20'
                  }`}
                  title={isConnected ? 'Connected to real-time server' : 'Disconnected — changes may not sync live'}
                >
                  <div className={`size-1.5 rounded-full ${isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
                  {isConnected ? 'Live' : 'Offline'}
                </div>
              </div>

              <div className="flex items-center gap-2">
                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 size-3 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Search tasks..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-7 pr-7 py-1 text-xs bg-muted/30 border border-primary/10 rounded-full focus:outline-none focus:border-primary/30 w-48"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2 top-1/2 -translate-y-1/2"
                    >
                      <X className="size-3 text-muted-foreground hover:text-foreground" />
                    </button>
                  )}
                </div>

                {/* Tag filters */}
                {allTags.length > 0 && (
                  <div className="flex items-center gap-1">
                    <TagIcon className="size-3 text-muted-foreground" />
                    {allTags.map((tag) => (
                      <button
                        key={tag.id}
                        onClick={() => {
                          setSelectedTagIds((prev) =>
                            prev.includes(tag.id)
                              ? prev.filter((id) => id !== tag.id)
                              : [...prev, tag.id]
                          )
                        }}
                        className={`px-2 py-0.5 text-[10px] rounded-full border transition-colors ${
                          selectedTagIds.includes(tag.id)
                            ? 'bg-primary/20 border-primary/40 text-primary'
                            : 'bg-muted/30 border-primary/10 text-muted-foreground hover:bg-muted/50'
                        }`}
                        style={
                          selectedTagIds.includes(tag.id)
                            ? {}
                            : { borderColor: tag.color + '40' }
                        }
                      >
                        {tag.name}
                      </button>
                    ))}
                  </div>
                )}

                {/* Clear filters */}
                {(searchQuery || selectedTagIds.length > 0) && (
                  <button
                    onClick={() => {
                      setSearchQuery('')
                      setSelectedTagIds([])
                    }}
                    className="text-[10px] text-muted-foreground hover:text-primary underline"
                  >
                    Clear filters
                  </button>
                )}
              </div>
            </div>

            <div className="flex gap-6 h-full min-w-full">
            <SortableContext items={columnsId} strategy={horizontalListSortingStrategy}>
              {filteredColumns.map((col: Column) => (
                <ColumnContainer
                  key={col.id}
                  column={col}
                  tasks={col.tasks}
                  currentUser={currentUser}
                  boardId={board.id}
                  boardMembers={board.members}
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
            editingTasks={editingTasks}
            boardId={board.id}
          />

          {typeof document !== 'undefined' && createPortal(
            <DragOverlay dropAnimation={dropAnimation}>
              {activeColumn && (
                <ColumnContainer
                  column={activeColumn}
                  tasks={activeColumn.tasks}
                  currentUser={currentUser}
                  boardId={board.id}
                  boardMembers={board.members}
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