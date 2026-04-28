import { NextRequest, NextResponse } from 'next/server'
import { ZodSchema, ZodError } from 'zod'

/**
 * Validates request body against a Zod schema
 * @param schema - The Zod schema to validate against
 * @param request - The NextRequest object
 * @returns Either the validated data or a NextResponse with validation errors
 */
export async function validateJsonBody<T>(
  schema: ZodSchema<T>,
  request: NextRequest
): Promise<{ success: true; data: T } | { success: false; response: NextResponse }> {
  try {
    const body = await request.json()
    const data = schema.parse(body)
    return { success: true, data }
  } catch (error) {
    if (error instanceof ZodError) {
      return {
        success: false,
        response: NextResponse.json(
          {
            error: 'Validation failed',
            details: error.issues.map((e) => ({
              field: e.path.join('.'),
              message: e.message,
            })),
          },
          { status: 400 }
        ),
      }
    }
    return {
      success: false,
      response: NextResponse.json(
        { error: 'Invalid request body' },
        { status: 400 }
      ),
    }
  }
}

/**
 * Validates that the request has the correct content-type header for state-changing operations.
 * Use this in API routes to ensure only JSON content is accepted for POST/PUT/PATCH requests.
 *
 * @param req - The NextRequest object
 * @returns NextResponse with error if validation fails, null if validation passes
 */
export function validateJsonContentType(req: NextRequest): NextResponse | null {
  const method = req.method
  const contentType = req.headers.get('content-type')

  // Only validate content-type for state-changing operations
  if (method === 'POST' || method === 'PUT' || method === 'PATCH') {
    // Allow requests with no body (some PUT operations might not have body)
    const hasBody = req.headers.get('content-length') !== '0'

    if (hasBody && (!contentType || !contentType.includes('application/json'))) {
      return NextResponse.json(
        { error: 'Unsupported Media Type', message: 'Content-Type must be application/json' },
        { status: 415 }
      )
    }
  }

  return null
}

/**
 * Validates the request origin for additional CSRF protection.
 * This provides defense-in-depth alongside same-site cookie protection.
 *
 * @param req - The NextRequest object
 * @param allowedOrigins - Array of allowed origins (defaults to ALLOWED_ORIGIN env var or localhost:3000)
 * @returns NextResponse with error if validation fails, null if validation passes
 */
export function validateOrigin(
  req: NextRequest,
  allowedOrigins?: string[]
): NextResponse | null {
  const origin = req.headers.get('origin')
  const referer = req.headers.get('referer')

  // Skip validation for GET requests as they don't modify state
  if (req.method === 'GET') {
    return null
  }

  // Allow requests with no origin/referer (e.g., same-origin, curl, API clients)
  if (!origin && !referer) {
    return null
  }

  const allowed = allowedOrigins || process.env.ALLOWED_ORIGIN?.split(',') || ['http://localhost:3000']

  // Check origin or referer against allowed list
  const requestOrigin = origin || referer
  if (requestOrigin) {
    const isAllowed = allowed.some((allowed) => {
      // Allow exact match or subdomain match
      return (
        requestOrigin === allowed ||
        requestOrigin.startsWith(allowed + '/') ||
        requestOrigin.startsWith(allowed + '?')
      )
    })

    if (!isAllowed) {
      return NextResponse.json(
        { error: 'Forbidden', message: 'Origin not allowed' },
        { status: 403 }
      )
    }
  }

  return null
}

/**
 * Higher-order function that validates JSON body before executing handler
 * @param schema - The Zod schema to validate against
 * @param handler - The API route handler
 * @returns A new handler that validates before executing
 */
export function withValidation<TBody, TParams = Record<string, string>>(
  schema: ZodSchema<TBody>,
  handler: (req: NextRequest, body: TBody, context?: { params: Promise<TParams> }) => Promise<NextResponse>
) {
  return (async (req: NextRequest, context?: { params: Promise<TParams> }) => {
    // Validate content type first
    const contentTypeError = validateJsonContentType(req)
    if (contentTypeError) return contentTypeError

    // Validate body
    const validation = await validateJsonBody(schema, req)
    if (!validation.success) return validation.response

    // Call handler with validated data
    return handler(req, validation.data, context)
  })
}
