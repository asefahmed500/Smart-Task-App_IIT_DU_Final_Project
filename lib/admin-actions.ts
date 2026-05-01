'use server'

import prisma from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { revalidatePath } from 'next/cache'
import { Role } from '../generated/prisma/client'
import bcrypt from 'bcryptjs'

async function checkAdmin() {
  const session = await getSession()
  if (!session || session.role !== 'ADMIN') {
    throw new Error('Unauthorized: Admin access required')
  }
  return session
}

export async function getUsers() {
  await checkAdmin()
  return await prisma.user.findMany({
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
    }
  })
}

export async function updateUserRole(userId: string, role: Role) {
  await checkAdmin()
  const user = await prisma.user.update({
    where: { id: userId },
    data: { role },
  })

  // Log the action
  const session = await getSession()
  await prisma.auditLog.create({
    data: {
      userId: session!.id,
      action: 'UPDATE_USER_ROLE',
      details: { targetUserId: userId, newRole: role },
    }
  })

  revalidatePath('/admin')
  revalidatePath('/admin/users')
  return user
}

export async function updateUserDetails(userId: string, data: { name?: string, email?: string }) {
  await checkAdmin()
  const user = await prisma.user.update({
    where: { id: userId },
    data,
  })

  // Log the action
  const session = await getSession()
  await prisma.auditLog.create({
    data: {
      userId: session!.id,
      action: 'UPDATE_USER_DETAILS',
      details: { targetUserId: userId, ...data },
    }
  })

  revalidatePath('/admin')
  revalidatePath('/admin/users')
  return user
}

export async function deleteUser(userId: string) {
  const session = await checkAdmin()
  
  if (userId === session.id) {
    throw new Error('Cannot delete your own admin account')
  }

  await prisma.user.delete({
    where: { id: userId },
  })

  // Log the action
  await prisma.auditLog.create({
    data: {
      userId: session.id,
      action: 'DELETE_USER',
      details: { targetUserId: userId },
    }
  })

  revalidatePath('/admin')
  revalidatePath('/admin/users')
}

export async function createUser(data: { name: string, email: string, password: string, role: Role }) {
  const session = await checkAdmin()
  
  const hashedPassword = await bcrypt.hash(data.password, 10)
  
  const user = await prisma.user.create({
    data: {
      ...data,
      password: hashedPassword
    }
  })

  // Log the action
  await prisma.auditLog.create({
    data: {
      userId: session.id,
      action: 'CREATE_USER',
      details: { targetUserId: user.id, email: user.email, role: user.role },
    }
  })

  revalidatePath('/admin')
  revalidatePath('/admin/users')
  return user
}

export async function getAuditLogs() {
  await checkAdmin()
  return await prisma.auditLog.findMany({
    take: 50,
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
}

export async function getAdminStats() {
  await checkAdmin()
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

  // Formatting for the chart
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

  // Real health check: Just a ping to DB
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
      action: { in: ['CREATE_AUTOMATION_RULE', 'TOGGLE_AUTOMATION_RULE', 'EXECUTE_AUTOMATION_RULE'] },
      createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
    }
  })

  return {
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

export async function getUserProfile() {
  const session = await getSession()
  if (!session) {
    throw new Error('Unauthorized')
  }

  return await prisma.user.findUnique({
    where: { id: session.id },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      image: true,
      createdAt: true,
    }
  })
}

export async function updateUserProfile(data: { name?: string, image?: string }) {
  const session = await getSession()
  if (!session) {
    throw new Error('Unauthorized')
  }

  const user = await prisma.user.update({
    where: { id: session.id },
    data,
  })

  // Log the action
  await prisma.auditLog.create({
    data: {
      userId: session.id,
      action: 'UPDATE_PROFILE',
      details: { ...data },
    }
  })

  revalidatePath('/profile')
  revalidatePath('/admin')
  return user
}

export async function getAllBoards() {
  await checkAdmin()
  return await prisma.board.findMany({
    include: {
      owner: {
        select: {
          name: true,
          email: true,
        }
      },
      _count: {
        select: {
          members: true,
          columns: true,
        }
      }
    }
  })
}
export async function getAutomationRules() {
  await checkAdmin()
  return await prisma.automationRule.findMany({
    orderBy: { createdAt: 'desc' }
  })
}

export async function createAutomationRule(data: { name: string, trigger: string, action: string, condition?: string }) {
  const session = await checkAdmin()
  const rule = await prisma.automationRule.create({
    data
  })

  // Log the action
  await prisma.auditLog.create({
    data: {
      userId: session.id,
      action: 'CREATE_AUTOMATION_RULE',
      details: { ruleId: rule.id, name: rule.name },
    }
  })

  revalidatePath('/admin/automation')
  return rule
}

export async function toggleAutomationRule(ruleId: string, enabled: boolean) {
  const session = await checkAdmin()
  const rule = await prisma.automationRule.update({
    where: { id: ruleId },
    data: { enabled }
  })

  // Log the action
  await prisma.auditLog.create({
    data: {
      userId: session.id,
      action: 'TOGGLE_AUTOMATION_RULE',
      details: { ruleId, enabled },
    }
  })

  revalidatePath('/admin/automation')
  return rule
}

export async function deleteAutomationRule(ruleId: string) {
  const session = await checkAdmin()
  await prisma.automationRule.delete({
    where: { id: ruleId }
  })

  // Log the action
  await prisma.auditLog.create({
    data: {
      userId: session.id,
      action: 'DELETE_AUTOMATION_RULE',
      details: { ruleId },
    }
  })

  revalidatePath('/admin/automation')
}

export async function getSystemReports() {
  await checkAdmin()
  
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
  
  // Real throughput based on audit logs
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
      tasks: count
    }
  })

  return {
    metrics: [
      { title: "Total Tasks", value: taskCount.toString(), change: "Live", icon: "Layers", color: "text-blue-500" },
      { title: "Completion Rate", value: `${completionRate}%`, change: "Real-time", icon: "TrendingUp", color: "text-green-500" },
      { title: "Resolved Tasks", value: `${completedTaskCount}`, change: "System-wide", icon: "BarChart3", color: "text-purple-500" },
      { title: "Total Users", value: userCount.toString(), change: "Active", icon: "Users", color: "text-orange-500" },
    ],
    throughputData: throughputData.map(d => ({ name: d.name, value: d.tasks }))
  }
}

export async function getAutomationStats() {
  await checkAdmin()
  const execCount = await prisma.auditLog.count({
    where: {
      action: 'EXECUTE_AUTOMATION_RULE',
      createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
    }
  })
  return { execCount }
}
