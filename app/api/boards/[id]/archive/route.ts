import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireApiRole } from '@/lib/session'

interface RouteContext {
  params: Promise<{ id: string }>
}

// POST /api/boards/:id/archive - Archive or unarchive a board (Manager/Admin only)
export async function POST(req: NextRequest, { params }: RouteContext) {
  const authResult = await requireApiRole(['MANAGER', 'ADMIN'])
  if (authResult instanceof NextResponse) return authResult

  try {
    const { id } = await params
    const body = await req.json()
    const { archived } = body

    const board = await prisma.board.findUnique({
      where: { id },
      select: { ownerId: true }
    })

    if (!board) {
      return NextResponse.json({ error: 'Board not found' }, { status: 404 })
    }

    const updated = await prisma.board.update({
      where: { id },
      data: { archived: archived ?? false }
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Archive board error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
