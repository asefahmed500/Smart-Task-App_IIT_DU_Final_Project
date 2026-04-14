import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireApiRole } from '@/lib/session'

// GET /api/admin/stats - Get platform statistics (Admin only)
export async function GET(req: NextRequest) {
  try {
    await requireApiRole(['ADMIN'])

    const [
      totalUsers,
      activeUsers,
      totalBoards,
      totalTasks,
      tasksByStatus,
      tasksByPriority,
      userRoleDistribution,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { isActive: true } }),
      prisma.board.count(),
      prisma.task.count(),
      // Tasks by status (using column names as proxy)
      prisma.task.groupBy({
        by: ['columnId'],
        _count: true,
      }),
      // Tasks by priority
      prisma.task.groupBy({
        by: ['priority'],
        _count: true,
      }),
      // User role distribution
      prisma.user.groupBy({
        by: ['role'],
        _count: true,
        where: { isActive: true },
      }),
    ])

    // Get column names for status breakdown
    const columns = await prisma.column.findMany({
      select: { id: true, name: true },
    })

    const statusBreakdown = tasksByStatus.map(item => {
      const column = columns.find(c => c.id === item.columnId)
      return {
        status: column?.name || 'Unknown',
        count: item._count,
      }
    })

    return NextResponse.json({
      totalUsers,
      activeUsers,
      totalBoards,
      totalTasks,
      statusBreakdown,
      priorityBreakdown: tasksByPriority.map(item => ({
        priority: item.priority,
        count: item._count,
      })),
      roleDistribution: userRoleDistribution.map(item => ({
        role: item.role,
        count: item._count,
      })),
    })
  } catch (error: any) {
    if (error.message === 'Unauthorized' || error.message === 'Forbidden') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    console.error('Get stats error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
