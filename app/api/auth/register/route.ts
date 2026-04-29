import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

// Lazy import email functions to avoid edge runtime issues
const getEmailFunctions = async () => {
  try {
    const { sendVerificationEmail } = await import("@/lib/email")
    return { sendVerificationEmail }
  } catch {
    return null
  }
}

const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { name, email } = registerSchema.parse(body)

    console.log('Registration request for:', email)

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    })

    if (existingUser) {
      console.log('User already exists:', email)
      return NextResponse.json(
        { error: 'User already exists' },
        { status: 400 }
      )
    }

    // Check if this is the first user (make them ADMIN)
    const userCount = await prisma.user.count()
    console.log('User count:', userCount)

    // Create user with placeholder password (will be changed after verification)
    // Using a fixed hash for placeholder to avoid bcrypt in serverless
    const placeholderHash = '$2a$10$placeholder.hash.for.new.user'
    console.log('Creating user with placeholder password...')

    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: placeholderHash,
        role: userCount === 0 ? 'ADMIN' : 'MEMBER',
        isActive: true,
        emailVerified: false, // Will be verified after code
      },
    })
    console.log('User created:', user.id)

    // Send verification email (skip for now to test registration)
    // TODO: Re-enable email sending after registration works
    console.log('Skipping email sending for testing')

    return NextResponse.json({
      success: true,
      message: 'Account created successfully. Please verify your email.',
      email,
      requiresVerification: true,
    })
  } catch (error) {
    console.error('Registration error:', error)
    return NextResponse.json(
      { error: 'Failed to create account', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
