import { prisma } from '@/lib/prisma'

export interface ThroughputData {
  date: string
  count: number
}

/**
 * Calculate throughput (completed tasks) for a board over the last 90 days
 * @param boardId - The board ID
 * @param days - Number of days to look back (default: 90)
 */
export async function calculateThroughput(
  boardId: string,
  days: number = 90
): Promise<ThroughputData[]> {
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - days)
  startDate.setHours(0, 0, 0, 0)

  // Get completed tasks grouped by completion date
  const completedTasks = await prisma.task.findMany({
    where: {
      boardId,
      completedAt: {
        gte: startDate,
      },
    },
    select: {
      completedAt: true,
    },
  })

  // Initialize all days with 0 count
  const throughputMap = new Map<string, number>()
  const today = new Date()

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(today)
    date.setDate(date.getDate() - i)
    date.setHours(0, 0, 0, 0)
    const dateStr = date.toISOString().split('T')[0]
    throughputMap.set(dateStr, 0)
  }

  // Count tasks per day
  for (const task of completedTasks) {
    if (task.completedAt) {
      const dateStr = task.completedAt.toISOString().split('T')[0]
      throughputMap.set(dateStr, (throughputMap.get(dateStr) || 0) + 1)
    }
  }

  // Convert to array and sort by date
  return Array.from(throughputMap.entries())
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date))
}

/**
 * Calculate average throughput over a period
 * @param boardId - The board ID
 * @param days - Number of days to look back (default: 30)
 */
export async function calculateAverageThroughput(
  boardId: string,
  days: number = 30
): Promise<number> {
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - days)

  const count = await prisma.task.count({
    where: {
      boardId,
      completedAt: {
        gte: startDate,
      },
    },
  })

  return Math.round((count / days) * 10) / 10
}
