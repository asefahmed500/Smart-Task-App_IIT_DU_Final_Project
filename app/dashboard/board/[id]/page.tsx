import { getBoardData } from "@/lib/board-actions"
import { getSession } from "@/lib/auth"
import { redirect, notFound } from "next/navigation"
import { KanbanBoard } from "@/components/kanban/kanban-board"
import { BoardHeader } from "@/components/kanban/board-header"

export default async function BoardPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await getSession()
  if (!session) redirect('/login')

  const board = await getBoardData(id)
  if (!board) notFound()

  return (
    <div className="h-[calc(100vh-12rem)] flex flex-col gap-6 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Board Header */}
      <BoardHeader board={board} currentUser={session} />


      {/* Kanban Board Container */}
      <div className="flex-1 min-h-0 bg-muted/20 rounded-2xl border border-primary/5 p-4 overflow-hidden relative">
        <div className="absolute inset-0 bg-noise opacity-[0.02] pointer-events-none" />
        <KanbanBoard board={board} currentUser={session} />
      </div>
    </div>
  )
}
