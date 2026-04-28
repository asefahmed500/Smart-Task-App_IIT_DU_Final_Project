import { NextRequest, NextResponse } from 'next/server'
import { requireApiAuth, requireApiRole, SessionUser } from '@/lib/session'

export interface AuthenticatedRequest extends NextRequest {
  session: SessionUser
}

export type RouteContext<T = Record<string, string>> = {
  params: Promise<T>
}

/**
 * Higher-order function that wraps an API route handler with authentication
 * @param handler - The API route handler function
 * @returns A new handler that checks authentication before executing
 */
export function withAuth<TParams = Record<string, string>>(
  handler: (req: AuthenticatedRequest, context: RouteContext<TParams>) => Promise<NextResponse>
) {
  return async (req: NextRequest, context: RouteContext<TParams>) => {
    const authResult = await requireApiAuth()
    if (authResult instanceof NextResponse) return authResult

    // Attach session to request for use in handler
    const authenticatedReq = req as AuthenticatedRequest
    authenticatedReq.session = authResult

    return handler(authenticatedReq, context)
  }
}

/**
 * Higher-order function that wraps an API route handler with role-based authorization
 * @param allowedRoles - Array of roles that can access this route
 * @param handler - The API route handler function
 * @returns A new handler that checks authentication and role before executing
 */
export function withAuthRole<TParams = Record<string, string>>(
  allowedRoles: ('ADMIN' | 'MANAGER' | 'MEMBER')[],
  handler: (req: AuthenticatedRequest, context: RouteContext<TParams>) => Promise<NextResponse>
) {
  return async (req: NextRequest, context: RouteContext<TParams>) => {
    const authResult = await requireApiRole(allowedRoles)
    if (authResult instanceof NextResponse) return authResult

    // Attach session to request for use in handler
    const authenticatedReq = req as AuthenticatedRequest
    authenticatedReq.session = authResult

    return handler(authenticatedReq, context)
  }
}

/**
 * Extracts the session from a request that has been through withAuth or withAuthRole
 * @param req - The NextRequest object
 * @returns The session object
 */
export function getSessionFromRequest(req: NextRequest): SessionUser | undefined {
  return (req as AuthenticatedRequest).session
}

