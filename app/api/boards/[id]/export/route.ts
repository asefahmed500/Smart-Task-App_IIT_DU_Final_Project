import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireApiAuth } from "@/lib/session"
import { verifyBoardAccess } from "@/lib/board-access"

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireApiAuth()
  if (authResult instanceof NextResponse) return authResult
  const session = authResult

  try {
    const { id: boardId } = await params
    const format = req.nextUrl.searchParams.get("format") || "json"

    const board = await verifyBoardAccess(session.user.id, boardId)
    if (!board) {
      return NextResponse.json({ error: "Board not found" }, { status: 404 })
    }

    const fullBoard = await prisma.board.findUnique({
      where: { id: boardId },
      include: {
        columns: {
          include: {
            tasks: {
              include: {
                assignee: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                  },
                },
              },
            },
          },
        },
      },
    })

    if (!fullBoard) {
      return NextResponse.json({ error: "Board not found" }, { status: 404 })
    }

    if (format === "csv") {
      const tasks = fullBoard.columns.flatMap((col: { name: string; tasks: typeof fullBoard.columns[number]['tasks'] }) =>
        col.tasks.map((task: any) => ({
          id: task.id,
          title: task.title,
          description: task.description || "",
          status: col.name,
          priority: task.priority,
          assignee: task.assignee?.name || "Unassigned",
          dueDate: task.dueDate ? new Date(task.dueDate).toISOString() : "",
          createdAt: new Date(task.createdAt).toISOString(),
          labels: (task.labels || []).join(", "),
        }))
      )

      if (tasks.length === 0) {
        return new NextResponse("id,title,description,status,priority,assignee,dueDate,createdAt,labels", {
          headers: {
            "Content-Type": "text/csv",
            "Content-Disposition": `attachment; filename="board-${fullBoard.name.replace(/\s+/g, "-")}.csv"`,
          },
        })
      }

      const headers = Object.keys(tasks[0]).join(",")
      const rows = tasks.map((task: Record<string, unknown>) =>
        Object.values(task)
          .map((value) => `"${String(value).replace(/"/g, '""')}"`)
          .join(",")
      )
      const csv = [headers, ...rows].join("\n")

      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": `attachment; filename="board-${fullBoard.name.replace(/\s+/g, "-")}.csv"`,
        },
      })
    }

    return NextResponse.json(fullBoard)
  } catch (error) {
    console.error("Export error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}