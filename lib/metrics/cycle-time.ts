import { prisma } from '@/lib/prisma'

/**
 * Calculate cycle time (completedAt - inProgressAt) for tasks on a board
 * @param boardId - The board ID
 */
export async function calculateCycleTime(boardId: string) {
  const tasks = await prisma.task.findMany({
    where: {
      boardId,
      completedAt: { not: null },
      inProgressAt: { not: null },
    },
    select: {
      completedAt: true,
      inProgressAt: true,
    },
  })

  if (tasks.length === 0) return { avg: 0, median: 0, p95: 0, count: 0 }

  const cycleTimes = tasks.map((task) => {
    const completed = new Date(task.completedAt!).getTime()
    const started = new Date(task.inProgressAt!).getTime()
    return Math.round((completed - started) / (1000 * 60 * 60 * 24) * 10) / 10 // in days
  })

  cycleTimes.sort((a: number, b: number) => a - b)

  const avg = cycleTimes.reduce((sum: number, t: number) => sum + t, 0) / cycleTimes.length
  const median = cycleTimes[Math.floor(cycleTimes.length / 2)]
  const p95 = cycleTimes[Math.floor(cycleTimes.length * 0.95)]

  return {
    avg: Math.round(avg * 10) / 10,
    median: Math.round(median * 10) / 10,
    p95: Math.round(p95 * 10) / 10,
    count: cycleTimes.length,
  }
}
