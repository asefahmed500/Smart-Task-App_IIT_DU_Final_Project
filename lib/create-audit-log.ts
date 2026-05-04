import prisma from "@/lib/prisma"
import { getClientIp } from "@/lib/audit"

interface AuditLogInput {
  userId: string
  action: string
  details: any
}

export async function createAuditLog(input: AuditLogInput) {
  const ipAddress = await getClientIp()
  return prisma.auditLog.create({
    data: {
      userId: input.userId,
      action: input.action,
      details: input.details,
      ipAddress,
    },
  })
}