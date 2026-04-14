import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireApiRole } from '@/lib/session'

// GET /api/admin/audit - Get platform-wide audit log (Admin only)
export async function GET(req: NextRequest) {
  const authResult = await requireApiRole(['ADMIN'])
  if (authResult instanceof NextResponse) return authResult

  try {
    const { searchParams } = new URL(req.url)
    const limit = parseInt(searchParams.get('limit') || '100')
    const offset = parseInt(searchParams.get('offset') || '0')

    const auditLogs = await prisma.auditLog.findMany({
      include: {
        actor: {
          select: { id: true, name: true, email: true, avatar: true },
        },
        target: {
          select: { id: true, name: true, email: true },
        },
        board: {
          select: { id: true, name: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    })

    return NextResponse.json(auditLogs)
  } catch (error) {
    console.error('Get audit error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
