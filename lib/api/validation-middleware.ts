import { NextRequest, NextResponse } from 'next/server'
import { ZodSchema, ZodError } from 'zod'

export async function validateRequest<T>(
  req: NextRequest,
  schema: ZodSchema<T>
): Promise<{ success: true; data: T } | { success: false; error: NextResponse }> {
  try {
    const body = await req.json()
    const result = schema.safeParse(body)

    if (!result.success) {
      return {
        success: false,
        error: NextResponse.json(
          { error: 'Validation failed', details: (result.error as ZodError).issues },
          { status: 400 }
        )
      }
    }

    return { success: true, data: result.data }
  } catch {
    return {
      success: false,
      error: NextResponse.json(
        { error: 'Invalid JSON' },
        { status: 400 }
      )
    }
  }
}
