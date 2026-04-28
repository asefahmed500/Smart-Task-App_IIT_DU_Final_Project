import { NextResponse } from 'next/server'

interface PrismaError {
  code?: string
  meta?: {
    target?: string[]
  }
  name?: string
}

export function handlePrismaError(error: unknown): NextResponse {
  console.error('Prisma error:', error)

  const prismaError = error as PrismaError
  if (prismaError?.code) {
    // Unique constraint violation
    if (prismaError.code === 'P2002') {
      const fields = prismaError.meta?.target || []
      return NextResponse.json(
        { error: `Duplicate entry for ${fields.join(', ')}` },
        { status: 409 }
      )
    }

    // Record not found
    if (prismaError.code === 'P2025') {
      return NextResponse.json(
        { error: 'Record not found' },
        { status: 404 }
      )
    }

    // Foreign key constraint violation
    if (prismaError.code === 'P2003') {
      return NextResponse.json(
        { error: 'Referenced record does not exist' },
        { status: 400 }
      )
    }

    // Related record not found
    if (prismaError.code === 'P2018') {
      return NextResponse.json(
        { error: 'Required connected record not found' },
        { status: 404 }
      )
    }
  }

  // Validation errors
  if (prismaError?.name === 'PrismaClientValidationError') {
    return NextResponse.json(
      { error: 'Invalid data provided' },
      { status: 400 }
    )
  }

  // Initialization errors
  if (prismaError?.name === 'PrismaClientInitializationError') {
    return NextResponse.json(
      { error: 'Database connection failed' },
      { status: 503 }
    )
  }

  // Unknown error
  return NextResponse.json(
    { error: 'An unexpected error occurred' },
    { status: 500 }
  )
}

export function isPrismaError(error: unknown): boolean {
  const err = error as PrismaError
  return !!(err?.code && typeof err.code === 'string' && err.code.startsWith('P'))
}
