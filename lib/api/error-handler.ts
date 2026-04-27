import { NextResponse } from 'next/server'
import { ZodError } from 'zod'

/**
 * Standard API error response format
 */
export interface ApiError {
  error: string
  details?: string
  field?: string
  code?: string
}

/**
 * HTTP status codes with semantic meaning
 */
export const HttpStatus = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  NOT_IMPLEMENTED: 501,
  BAD_GATEWAY: 502,
  SERVICE_UNAVAILABLE: 503,
} as const

/**
 * Handle API errors consistently across all routes
 * Provides meaningful error messages to clients while logging details server-side
 */
export class ApiErrorHandler {
  /**
   * Handle unknown errors - logs details but returns generic message
   */
  static handleUnknown(error: unknown, context: string = 'Operation'): NextResponse {
    console.error(`[${context}] Unexpected error:`, error)

    // Check for specific error types
    if (error instanceof Error) {
      // Prisma errors
      if ('code' in error) {
        return this.handlePrismaError(error as any, context)
      }

      // Zod errors
      if (error instanceof ZodError) {
        return NextResponse.json(
          { error: 'Validation failed', details: error.issues },
          { status: 400 }
        )
      }
    }

    // Generic fallback
    return NextResponse.json(
      { error: 'An unexpected error occurred. Please try again.' },
      { status: 500 }
    )
  }

  /**
   * Handle Prisma-specific errors with meaningful messages
   */
  private static handlePrismaError(error: any & { code: string }, context: string): NextResponse {
    const prismaErrors: Record<string, { status: number; message: string; code?: string }> = {
      P2002: { status: 400, message: 'Invalid input data', code: 'INVALID_INPUT' },
      P2025: { status: 404, message: 'Record not found', code: 'NOT_FOUND' },
      P2003: { status: 403, message: 'Foreign key constraint failed', code: 'FOREIGN_KEY' },
      P2001: { status: 400, message: 'Unique constraint failed', code: 'DUPLICATE' },
      P2014: { status: 400, message: 'The required field is missing', code: 'REQUIRED_FIELD' },
      P2011: { status: 409, message: 'Constraint violation', code: 'CONSTRAINT' },
    }

    const errorInfo = prismaErrors[error.code]

    if (errorInfo) {
      console.warn(`[${context}] Prisma error ${error.code}:`, error.message)
      return NextResponse.json(
        { error: errorInfo.message, code: errorInfo.code },
        { status: errorInfo.status }
      )
    }

    // Unknown Prisma error
    console.error(`[${context}] Unknown Prisma error:`, error)
    return NextResponse.json(
      { error: 'Database error occurred', code: 'DATABASE_ERROR' },
      { status: 500 }
    )
  }

  /**
   * Common error responses
   */
  static unauthorized(message: string = 'Authentication required'): NextResponse {
    return NextResponse.json({ error: message }, { status: 401 })
  }

  static forbidden(message: string = 'Access denied'): NextResponse {
    return NextResponse.json({ error: message }, { status: 403 })
  }

  static notFound(message: string = 'Resource not found'): NextResponse {
    return NextResponse.json({ error: message }, { status: 404 })
  }

  static badRequest(message: string, details?: any): NextResponse {
    return NextResponse.json(
      { error: message, details },
      { status: 400 }
    )
  }

  static conflict(message: string, details?: any): NextResponse {
    return NextResponse.json(
      { error: message, details },
      { status: 409 }
    )
  }

  static serverError(message: string = 'Internal server error'): NextResponse {
    return NextResponse.json({ error: message }, { status: 500 })
  }

  /**
   * Wrap async route handlers with consistent error handling
   */
  static withHandler<T>(
    handler: (req: Request, context?: T) => Promise<Response>,
    context: string = 'API'
  ) {
    return async (req: Request, context?: T): Promise<Response> => {
      try {
        return await handler(req, context)
      } catch (error) {
        return this.handleUnknown(error, context as string)
      }
    }
  }
}
