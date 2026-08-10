/**
 * Centralized "Done / In Progress / To Do" column detection — PURE helpers.
 *
 * SmartTask does not store an explicit status on tasks — status is derived
 * from the column NAME. Multiple synonyms exist across the 4 board templates
 * (Done/Completed/Resolved/Launch, In Progress/Doing/Review, To Do/Backlog/
 * Ready/Reported/Triaged/Planning).
 *
 * IMPORTANT: This module MUST stay free of any `@/lib/prisma` import. It is
 * imported by client components (e.g. sprint-review.tsx), and importing the
 * pg-based Prisma client here would pull the whole database driver into the
 * browser bundle. The server-only DB lookups (findDoneColumnName & friends)
 * live in `lib/column-helpers.ts`.
 *
 * `AGENTS.md`: "Never hardcode Done elsewhere; use findDoneColumnName()."
 */

const DONE_TOKENS = ['done', 'completed', 'resolved', 'launch', 'closed', 'shipped']
const IN_PROGRESS_TOKENS = ['progress', 'doing', 'active', 'started', 'review', 'testing', 'development', 'design', 'triaged', 'in progress']
const TODO_TOKENS = ['todo', 'to do', 'backlog', 'ready', 'reported', 'planning', 'blocked', 'new']

function norm(name: string | undefined | null): string {
  return (name || '').trim().toLowerCase()
}

/** True if the column name reads as a "done/finished" column. */
export function isDoneColumn(name: string | undefined | null): boolean {
  const n = norm(name)
  return DONE_TOKENS.some((t) => n === t || n.includes(t))
}

/** True if the column name reads as an "in progress / active work" column. */
export function isInProgressColumn(name: string | undefined | null): boolean {
  const n = norm(name)
  return IN_PROGRESS_TOKENS.some((t) => n === t || n.includes(t))
}

/** True if the column name reads as a "to do / not started" column. */
export function isTodoColumn(name: string | undefined | null): boolean {
  const n = norm(name)
  return TODO_TOKENS.some((t) => n === t || n.includes(t))
}
