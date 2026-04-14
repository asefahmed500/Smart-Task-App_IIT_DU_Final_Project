import BoardView from '@/components/kanban/board-view'

// Next.js 16 App Router requires params to be a Promise
export default async function BoardPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params
  return <BoardView boardId={resolvedParams.id} />
}
