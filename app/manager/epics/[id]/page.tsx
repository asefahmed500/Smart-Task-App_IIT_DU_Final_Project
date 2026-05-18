import { getSession } from '@/lib/auth-server'
import { redirect } from 'next/navigation'
import { EpicDetail } from '@/components/sprint/epic-detail'

export default async function EpicDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ boardId?: string }>
}) {
  const session = await getSession()
  if (!session) redirect('/login')

  const { id } = await params
  const { boardId } = await searchParams

  return (
    <div className="container mx-auto py-6 max-w-4xl">
      <EpicDetail epicId={id} basePath="/manager" />
    </div>
  )
}
