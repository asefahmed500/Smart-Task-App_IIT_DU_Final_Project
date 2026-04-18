import { NextRequest, NextResponse } from 'next/server'
import { requireApiAuth, requireApiRole } from '@/lib/session'

/**
 * Higher-order function that wraps an API route handler with authentication
 * @param handler - The API route handler function
 * @returns A new handler that checks authentication before executing
 */
export function withAuth<T extends (
  req: NextRequest,
  context?: { params: Promise<any> }
) => Promise<NextResponse>>(
  handler: T
): T {
  return (async (req: NextRequest, context?: { params: Promise<any> }) => {
    const authResult = await requireApiAuth()
    if (authResult instanceof NextResponse) return authResult

    // Attach session to request for use in handler
    ;(req as any).session = authResult

    return handler(req, context)
  }) as T
}

/**
 * Higher-order function that wraps an API route handler with role-based authorization
 * @param allowedRoles - Array of roles that can access this route
 * @param handler - The API route handler function
 * @returns A new handler that checks authentication and role before executing
 */
export function withAuthRole<T extends (
  req: NextRequest,
  context?: { params: Promise<any> }
) => Promise<NextResponse>>(
  allowedRoles: ('ADMIN' | 'MANAGER' | 'MEMBER')[],
  handler: T
): T {
  return (async (req: NextRequest, context?: { params: Promise<any> }) => {
    const authResult = await requireApiRole(allowedRoles)
    if (authResult instanceof NextResponse) return authResult

    // Attach session to request for use in handler
    ;(req as any).session = authResult

    return handler(req, context)
  }) as T
}

/**
 * Extracts the session from a request that has been through withAuth or withAuthRole
 * @param req - The NextRequest object
 * @returns The session object
 */
export function getSessionFromRequest(req: NextRequest) {
  return (req as any).session
}
