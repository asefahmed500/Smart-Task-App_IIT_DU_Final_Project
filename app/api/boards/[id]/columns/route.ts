import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireApiAuth } from '@/lib/session'

interface RouteContext {
  params: Promise<{ id: string }>
}

// GET /api/boards/:id/columns - Get board columns (all authenticated board members)
export async function GET(req: NextRequest, { params }: RouteContext) {
  const authResult = await requireApiAuth()
  if (authResult instanceof NextResponse) return authResult

  try {
    const { id } = await params

    const columns = await prisma.column.findMany({
      where: { boardId: id },
      orderBy: { position: 'asc' },
      include: {
        _count: {
          select: { tasks: true },
        },
      },
    })

    return NextResponse.json(columns)
  } catch (error) {
    console.error('Get columns error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
