import prisma from '@/lib/prisma'
import { isDoneColumn, isInProgressColumn, isTodoColumn } from '@/utils/column-utils'

/**
 * Server-side column lookups.
 *
 * These query the database, so they live here (NOT in `utils/column-utils.ts`)
 * to keep the pure helpers importable from client components without dragging
 * the pg-based Prisma client into the browser bundle.
 */

/** Server-side: resolves the "Done" column NAME for a board by matching known
 * synonyms, falling back to the last column by order, then the literal 'Done'. */
export async function findDoneColumnName(boardId: string): Promise<string> {
  const columns = await prisma.column.findMany({
    where: { boardId },
    select: { id: true, name: true, order: true },
    orderBy: { order: 'asc' },
  })
  const doneCol = columns.find((c) => isDoneColumn(c.name))
  return doneCol?.name || columns[columns.length - 1]?.name || 'Done'
}

/** Server-side: resolves the "In Progress" column NAME (fallback: 2nd column). */
export async function findInProgressColumnName(boardId: string): Promise<string | null> {
  const columns = await prisma.column.findMany({
    where: { boardId },
    select: { name: true, order: true },
    orderBy: { order: 'asc' },
  })
  const col = columns.find((c) => isInProgressColumn(c.name))
  return col?.name || columns[1]?.name || null
}

/** Server-side: resolves the "To Do" column NAME (fallback: 1st column). */
export async function findTodoColumnName(boardId: string): Promise<string | null> {
  const columns = await prisma.column.findMany({
    where: { boardId },
    select: { name: true, order: true },
    orderBy: { order: 'asc' },
  })
  const col = columns.find((c) => isTodoColumn(c.name))
  return col?.name || columns[0]?.name || null
}
