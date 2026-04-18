import { NextRequest, NextResponse } from 'next/server'
import { handlePrismaError } from './errors/prisma-handler'
import { requireApiRole } from './session'

export interface ApiErrorOptions {
  code: string
  message: string
  details?: unknown
  status: number
}

export class ApiError extends Error {
  code: string
  status: number
  details?: unknown

  constructor(options: ApiErrorOptions) {
    super(options.message)
    this.name = 'ApiError'
    this.code = options.code
    this.status = options.status
    this.details = options.details
  }
}

/**
 * Standardized API error response
 */
export class ApiErrorResponse {
  static error(message: string, status: number = 500, code?: string, details?: unknown): NextResponse {
    const body: any = { error: message }
    if (code) body.code = code
    if (details) body.details = details

    return NextResponse.json(body, { status })
  }

  static validation(message: string, details?: unknown): NextResponse {
    return this.error(message, 400, 'VALIDATION_ERROR', details)
  }

  static notFound(resource: string = 'Resource'): NextResponse {
    return this.error(`${resource} not found`, 404, 'NOT_FOUND')
  }

  static forbidden(message: string = 'Forbidden'): NextResponse {
    return this.error(message, 403, 'FORBIDDEN')
  }

  static unauthorized(message: string = 'Unauthorized'): NextResponse {
    return this.error(message, 401, 'UNAUTHORIZED')
  }

  static conflict(message: string, details?: unknown): NextResponse {
    return this.error(message, 409, 'CONFLICT', details)
  }

  static tooManyRequests(message: string = 'Too many requests'): NextResponse {
    return this.error(message, 429, 'RATE_LIMIT_EXCEEDED')
  }

  /**
   * Handle any error and return appropriate response
   */
  static handle(error: unknown): NextResponse {
    // Prisma errors
    if (error && typeof error === 'object' && 'code' in error) {
      const prismaError = error as { code: string; [key: string]: unknown }
      if (prismaError.code.startsWith('P')) {
        // Create proper Error object for Prisma handler
        const errorObj = error instanceof Error ? error : new Error(String(error))
        return handlePrismaError(errorObj)
      }
    }

    // API errors
    if (error instanceof ApiError) {
      return this.error(error.message, error.status, error.code, error.details)
    }

    // Generic errors
    console.error('[API Error]', error)
    return this.error('Internal server error', 500, 'INTERNAL_ERROR')
  }
}

/**
 * Wrap an API handler with try-catch error handling
 */
export function withErrorHandling<T extends (
  req: NextRequest,
  context?: { params: Promise<any> }
) => Promise<NextResponse>>(
  handler: T
): T {
  return (async (req: NextRequest, context?: { params: Promise<any> }) => {
    try {
      return await handler(req, context)
    } catch (error) {
      return ApiErrorResponse.handle(error)
    }
  }) as T
}

/**
 * Combine auth and error handling middleware
 */
export function withAuthAndError<T extends (
  req: NextRequest,
  context?: { params: Promise<any> }
) => Promise<NextResponse>>(
  handler: T
): T {
  return withErrorHandling(handler)
}

/**
 * Combine role auth and error handling middleware
 */
export function withAuthRoleAndError<T extends (
  req: NextRequest,
  context?: { params: Promise<any> }
) => Promise<NextResponse>>(
  allowedRoles: ('ADMIN' | 'MANAGER' | 'MEMBER')[],
  handler: T
): T {
  return withErrorHandling(
    (async (req: NextRequest, context?: { params: Promise<any> }) => {
      const authResult = await requireApiRole(allowedRoles)
      if (authResult instanceof NextResponse) return authResult

      ;(req as any).session = authResult

      return handler(req, context)
    }) as T
  )
}
