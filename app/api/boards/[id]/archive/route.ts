import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireApiAuth } from '@/lib/session'
import { getEffectiveBoardRole } from '@/lib/board-roles'

interface RouteContext {
  params: Promise<{ id: string }>
}

// POST /api/boards/:id/archive - Archive or unarchive a board (Manager/Admin only)
export async function POST(req: NextRequest, { params }: RouteContext) {
  const authResult = await requireApiAuth()
  if (authResult instanceof NextResponse) return authResult
  const session = authResult

  try {
    const { id } = await params
    const body = await req.json()
    const { archived } = body

    // Check board-level role (not platform role)
    const effectiveRole = await getEffectiveBoardRole(session, id)
    if (effectiveRole === null) {
      return NextResponse.json({ error: 'Board not found or access denied' }, { status: 404 })
    }
    if (effectiveRole !== 'ADMIN' && effectiveRole !== 'MANAGER') {
      return NextResponse.json({ error: 'Forbidden: Only managers and admins can archive boards' }, { status: 403 })
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
