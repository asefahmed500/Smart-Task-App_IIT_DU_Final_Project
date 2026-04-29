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
    const body: { error: string; code?: string; details?: unknown } = { error: message }
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
    const errorMessage = error instanceof Error ? error.message : 'Internal server error'
    const errorDetails = error instanceof Error ? error.stack : String(error)
    
    return this.error(
      errorMessage, 
      500, 
      'INTERNAL_ERROR', 
      process.env.NODE_ENV !== 'production' ? errorDetails : undefined
    )
  }
}

/**
 * Wrap an API handler with try-catch error handling
 */
export function withErrorHandling<TParams = Record<string, string>>(
  handler: (req: NextRequest, context: { params: Promise<TParams> }) => Promise<NextResponse>
) {
  return async (req: NextRequest, context: { params: Promise<TParams> }) => {
    try {
      return await handler(req, context)
    } catch (error) {
      return ApiErrorResponse.handle(error)
    }
  }
}

/**
 * Combine auth and error handling middleware
 */
export function withAuthAndError<TParams = Record<string, string>>(
  handler: (req: NextRequest, context: { params: Promise<TParams> }) => Promise<NextResponse>
) {
  return withErrorHandling(handler)
}

/**
 * Combine role auth and error handling middleware
 */
export function withAuthRoleAndError<TParams = Record<string, string>>(
  allowedRoles: ('ADMIN' | 'MANAGER' | 'MEMBER')[],
  handler: (req: NextRequest, context: { params: Promise<TParams> }) => Promise<NextResponse>
) {
  return withErrorHandling<TParams>(
    async (req: NextRequest, context: { params: Promise<TParams> }) => {
      const authResult = await requireApiRole(allowedRoles)
      if (authResult instanceof NextResponse) return authResult

      // @ts-expect-error - session is added to request for downstream handlers
      req.session = authResult

      return handler(req, context)
    }
  )
}

