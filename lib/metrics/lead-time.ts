import { prisma } from '@/lib/prisma'

/**
 * Calculate lead time (completedAt - createdAt) for tasks on a board
 * @param boardId - The board ID
 */
export async function calculateLeadTime(boardId: string) {
  const tasks = await prisma.task.findMany({
    where: {
      boardId,
      completedAt: { not: null },
    },
    select: {
      createdAt: true,
      completedAt: true,
    },
  })

  if (tasks.length === 0) return { avg: 0, median: 0, p95: 0, count: 0 }

  const leadTimes = tasks.map((task) => {
    const completed = new Date(task.completedAt!).getTime()
    const created = new Date(task.createdAt).getTime()
    return Math.round((completed - created) / (1000 * 60 * 60 * 24) * 10) / 10 // in days
  })

  leadTimes.sort((a, b) => a - b)

  const avg = leadTimes.reduce((sum, t) => sum + t, 0) / leadTimes.length
  const median = leadTimes[Math.floor(leadTimes.length / 2)]
  const p95 = leadTimes[Math.floor(leadTimes.length * 0.95)]

  return {
    avg: Math.round(avg * 10) / 10,
    median: Math.round(median * 10) / 10,
    p95: Math.round(p95 * 10) / 10,
    count: leadTimes.length,
  }
}
