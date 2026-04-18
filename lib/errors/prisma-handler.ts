import { Prisma } from '@prisma/client'
import { NextResponse } from 'next/server'

export function handlePrismaError(error: unknown): NextResponse {
  console.error('Prisma error:', error)

  // Known Prisma errors
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    // Unique constraint violation
    if (error.code === 'P2002') {
      const fields = error.meta?.target as string[] || []
      return NextResponse.json(
        { error: `Duplicate entry for ${fields.join(', ')}` },
        { status: 409 }
      )
    }

    // Record not found
    if (error.code === 'P2025') {
      return NextResponse.json(
        { error: 'Record not found' },
        { status: 404 }
      )
    }

    // Foreign key constraint violation
    if (error.code === 'P2003') {
      return NextResponse.json(
        { error: 'Referenced record does not exist' },
        { status: 400 }
      )
    }

    // Related record not found
    if (error.code === 'P2018') {
      return NextResponse.json(
        { error: 'Required connected record not found' },
        { status: 404 }
      )
    }
  }

  // Validation errors
  if (error instanceof Prisma.PrismaClientValidationError) {
    return NextResponse.json(
      { error: 'Invalid data provided' },
      { status: 400 }
    )
  }

  // Initialization errors
  if (error instanceof Prisma.PrismaClientInitializationError) {
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

export function isPrismaError(error: unknown): error is Prisma.PrismaClientKnownRequestError {
  return error instanceof Prisma.PrismaClientKnownRequestError
}
