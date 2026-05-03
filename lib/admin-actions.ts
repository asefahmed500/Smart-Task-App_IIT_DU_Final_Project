'use server'

import prisma from '@/lib/prisma'
import { getSession } from '@/lib/auth-server'
import { revalidatePath } from 'next/cache'
import { Role } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { notifyAdminsNewUser } from '@/lib/notification-utils'
import { ActionResult } from '@/types/kanban'
import { idSchema, roleSchema } from './schemas'
import { z } from 'zod'
import { 
  getAutomationRules, 
  createAutomationRule, 
  updateAutomationRule, 
  deleteAutomationRule, 
  toggleAutomationRule 
} from './automation-actions'

const createUserSchema = z.object({
  name: z.string().min(1).max(50),
  email: z.string().email(),
  password: z.string().min(6),
  role: roleSchema
})

const updateUserSchema = z.object({
  id: idSchema,
  name: z.string().min(1).max(50).optional(),
  email: z.string().email().optional(),
  role: roleSchema.optional()
})

async function checkAdmin() {
  const session = await getSession()
  if (!session || session.role !== 'ADMIN') {
    return { success: false, error: 'Unauthorized: Admin access required' }
  }
  return { success: true, session }
}

export async function getUsers(): Promise<ActionResult> {
  const auth = await checkAdmin()
  if (!auth.success) return auth

  try {
    const users = await prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      }
    })
    return { success: true, data: users }
  } catch (error) {
    return { success: false, error: 'Failed to fetch users' }
  }
}

export async function updateUserRole(input: { userId: string, role: Role }): Promise<ActionResult> {
  const { userId, role } = input
  const auth = await checkAdmin()
  if (!auth.success) return auth

  try {
    const user = await prisma.user.update({
      where: { id: userId },
      data: { role },
    })

    await prisma.auditLog.create({
      data: {
        userId: auth.session!.id,
        action: 'UPDATE_USER_ROLE',
        details: { targetUserId: userId, newRole: role },
      }
    })

    revalidatePath('/admin')
    return { success: true, data: user }
  } catch (error) {
    return { success: false, error: 'Failed to update user role' }
  }
}

export async function deleteUser(input: { userId: string }): Promise<ActionResult> {
  const { userId } = input
  const auth = await checkAdmin()
  if (!auth.success) return auth

  if (userId === auth.session!.id) {
    return { success: false, error: 'Cannot delete your own admin account' }
  }

  try {
    await prisma.user.delete({
      where: { id: userId },
    })

    await prisma.auditLog.create({
      data: {
        userId: auth.session!.id,
        action: 'DELETE_USER',
        details: { targetUserId: userId },
      }
    })

    revalidatePath('/admin')
    return { success: true }
  } catch (error) {
    return { success: false, error: 'Failed to delete user' }
  }
}

export async function createUser(data: any): Promise<ActionResult> {
  const auth = await checkAdmin()
  if (!auth.success) return auth

  const validation = createUserSchema.safeParse(data)
  if (!validation.success) {
    return { success: false, error: 'Validation failed', fieldErrors: validation.error.flatten().fieldErrors }
  }

  try {
    const hashedPassword = await bcrypt.hash(validation.data.password, 10)
    
    const user = await prisma.user.create({
      data: {
        ...validation.data,
        password: hashedPassword
      }
    })

    await prisma.auditLog.create({
      data: {
        userId: auth.session!.id,
        action: 'CREATE_USER',
        details: { targetUserId: user.id, email: user.email, role: user.role },
      }
    })

    notifyAdminsNewUser(user.id, user.name, user.email, auth.session!.id).catch(console.error)

    revalidatePath('/admin')
    return { success: true, data: user }
  } catch (error) {
    return { success: false, error: 'Failed to create user' }
  }
}

export async function updateUserDetails(input: { userId: string, name?: string, email?: string }): Promise<ActionResult> {
  const { userId, ...data } = input
  const auth = await checkAdmin()
  if (!auth.success) return auth

  try {
    const user = await prisma.user.update({
      where: { id: userId },
      data,
    })

    await prisma.auditLog.create({
      data: {
        userId: auth.session!.id,
        action: 'UPDATE_USER_DETAILS',
        details: { targetUserId: userId, ...data },
      }
    })

    revalidatePath('/admin')
    return { success: true, data: user }
  } catch (error) {
    return { success: false, error: 'Failed to update user details' }
  }
}

export { 
  getAutomationRules, 
  createAutomationRule, 
  updateAutomationRule, 
  deleteAutomationRule, 
  toggleAutomationRule 
}

export async function getAuditLogs(): Promise<ActionResult> {
  const auth = await checkAdmin()
  if (!auth.success) return auth

  try {
    const logs = await prisma.auditLog.findMany({
      take: 100,
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            name: true,
            email: true,
          }
        }
      }
    })
    return { success: true, data: logs }
  } catch (error) {
    return { success: false, error: 'Failed to fetch audit logs' }
  }
}

export async function getAdminStats(): Promise<ActionResult> {
  const auth = await checkAdmin()
  if (!auth.success) return auth

  try {
    const [userCount, boardCount, totalLogs, recentLogsCount, last7DaysLogs] = await Promise.all([
      prisma.user.count(),
      prisma.board.count(),
      prisma.auditLog.count(),
      prisma.auditLog.count({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
          }
        }
      }),
      prisma.auditLog.groupBy({
        by: ['createdAt'],
        where: {
          createdAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
          }
        },
        _count: true,
      })
    ])

    const activityData = Array.from({ length: 7 }).map((_, i) => {
      const d = new Date()
      d.setDate(d.getDate() - (6 - i))
      const dateStr = d.toISOString().split('T')[0]
      
      const count = last7DaysLogs
        .filter(log => log.createdAt.toISOString().split('T')[0] === dateStr)
        .reduce((sum, log) => sum + log._count, 0)

      return {
        name: d.toLocaleDateString('en-US', { weekday: 'short' }),
        value: count
      }
    })

    let dbStatus = 'STABLE'
    let latency = '0ms'
    try {
      const start = Date.now()
      await prisma.$queryRaw`SELECT 1`
      latency = `${Date.now() - start}ms`
    } catch {
      dbStatus = 'DEGRADED'
    }

    const automationExecCount = await prisma.auditLog.count({
      where: {
        action: { in: ['AUTOMATION_EXECUTED'] },
        createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
      }
    })

    return {
      success: true,
      data: {
        userCount,
        boardCount,
        totalLogs,
        logCount: recentLogsCount,
        activityData,
        dbStatus,
        latency,
        automationExecCount
      }
    }
  } catch (error) {
    return { success: false, error: 'Failed to fetch admin stats' }
  }
}

export async function getAllBoards(): Promise<ActionResult> {
  const auth = await checkAdmin()
  if (!auth.success) return auth

  try {
    const boards = await prisma.board.findMany({
      include: {
        owner: { select: { name: true, email: true } },
        members: { select: { id: true, name: true, email: true } },
        _count: { select: { members: true, columns: true } }
      }
    })
    return { success: true, data: boards }
  } catch (error) {
    return { success: false, error: 'Failed to fetch boards' }
  }
}

export async function getSystemReports(): Promise<ActionResult> {
  const auth = await checkAdmin()
  if (!auth.success) return auth

  try {
    const [taskCount, completedTaskCount, userCount] = await Promise.all([
      prisma.task.count(),
      prisma.task.count({ 
        where: { 
          column: { 
            name: { contains: 'Done', mode: 'insensitive' } 
          } 
        } 
      }),
      prisma.user.count()
    ])

    const completionRate = taskCount > 0 ? Math.round((completedTaskCount / taskCount) * 100) : 0
    
    // Fetch tasks that are in a "Done" column to calculate Lead/Cycle times
    const doneTasks = await prisma.task.findMany({
      where: {
        column: {
          name: { contains: 'Done', mode: 'insensitive' }
        }
      },
      include: {
        column: true
      }
    })

    // Calculate Lead Time (Created -> Done)
    const leadTimes = doneTasks.map(task => {
      const duration = task.updatedAt.getTime() - task.createdAt.getTime()
      return duration / (1000 * 60 * 60 * 24) // Days
    })
    const avgLeadTime = leadTimes.length > 0 
      ? (leadTimes.reduce((a, b) => a + b, 0) / leadTimes.length).toFixed(1) 
      : "0"

    // Calculate Cycle Time (First move -> Done) - Approximated from first audit log of move
    const taskIds = doneTasks.map(t => t.id)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const firstMoves = await prisma.auditLog.findMany({
      where: {
        action: 'UPDATE_TASK_STATUS',
        createdAt: { gte: thirtyDaysAgo }
      },
      orderBy: { createdAt: 'asc' }
    })
    
    const relevantFirstMoves = firstMoves.filter(log => {
      const details = log.details as any
      return taskIds.includes(details.taskId)
    })
    
    // Simpler approximation for now: Cycle time is often 70% of lead time in typical flows, 
    // or we can fetch audit logs for these tasks.
    // Let's do a proper fetch for a few.
    const cycleTimeLogs = relevantFirstMoves

    const cycleTimes = doneTasks.map(task => {
      const firstMove = cycleTimeLogs.find(l => (l.details as any).taskId === task.id)
      if (!firstMove) return null
      const duration = task.updatedAt.getTime() - firstMove.createdAt.getTime()
      return duration / (1000 * 60 * 60 * 24)
    }).filter(t => t !== null) as number[]

    const avgCycleTime = cycleTimes.length > 0
      ? (cycleTimes.reduce((a, b) => a + b, 0) / cycleTimes.length).toFixed(1)
      : "0"

    const logs = await prisma.auditLog.findMany({
      where: {
        action: 'UPDATE_TASK_STATUS',
        details: { path: ['newStatus'], equals: 'Done' }
      },
      take: 500,
      orderBy: { createdAt: 'desc' }
    })

    const throughputData = Array.from({ length: 7 }).map((_, i) => {
      const d = new Date()
      d.setDate(d.getDate() - (6 - i))
      const dateStr = d.toISOString().split('T')[0]
      const count = logs.filter(l => l.createdAt.toISOString().split('T')[0] === dateStr).length
      return {
        name: d.toLocaleDateString('en-US', { weekday: 'short' }),
        value: count
      }
    })

    return {
      success: true,
      data: {
        metrics: [
          { title: "Total Tasks", value: taskCount.toString(), change: "Live", icon: "Layers", color: "text-blue-500" },
          { title: "Completion Rate", value: `${completionRate}%`, change: "Real-time", icon: "TrendingUp", color: "text-green-500" },
          { title: "Avg Lead Time", value: `${avgLeadTime} days`, change: "Created to Done", icon: "Clock", color: "text-orange-500" },
          { title: "Avg Cycle Time", value: `${avgCycleTime} days`, change: "Active to Done", icon: "Zap", color: "text-purple-500" },
        ],
        throughputData
      }
    }
  } catch (error) {
    return { success: false, error: 'Failed to fetch system reports' }
  }
}

export async function exportAuditLogsToCSV(): Promise<ActionResult> {
  const auth = await checkAdmin()
  if (!auth.success) return auth

  try {
    const logs = await prisma.auditLog.findMany({
      orderBy: { createdAt: 'desc' },
      include: { user: { select: { name: true, email: true } } }
    })

    const headers = ['Date', 'User', 'Email', 'Action', 'Details']
    const rows = logs.map(log => [
      log.createdAt.toISOString(),
      log.user.name || 'Unknown',
      log.user.email,
      log.action,
      JSON.stringify(log.details).replace(/"/g, '""')
    ])

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n')

    return { success: true, data: csvContent }
  } catch (error) {
    return { success: false, error: 'Failed to export CSV' }
  }
}
