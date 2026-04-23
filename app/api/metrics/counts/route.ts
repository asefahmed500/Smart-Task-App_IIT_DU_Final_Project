import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireApiAuth } from "@/lib/session"
import { startOfDay, endOfDay } from "date-fns"

export async function GET(req: NextRequest) {
  const authResult = await requireApiAuth()
  if (authResult instanceof NextResponse) return authResult
  const session = authResult

  try {
    const today = new Date()
    const start = startOfDay(today)
    const end = endOfDay(today)

    const userRole = session.user.role
    const isMember = userRole === "MEMBER"

    const dueTodayCount = await prisma.task.count({
      where: {
        dueDate: {
          gte: start,
          lte: end,
        },
        ...(isMember ? { assigneeId: session.user.id } : {}),
      },
    })

    const overdueCount = await prisma.task.count({
      where: {
        dueDate: {
          lt: start,
        },
        status: {
          not: "DONE",
        },
        ...(isMember ? { assigneeId: session.user.id } : {}),
      },
    })

    return NextResponse.json({
      dueToday: dueTodayCount,
      overdue: overdueCount,
    })
  } catch (error) {
    console.error("Get metrics counts error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}