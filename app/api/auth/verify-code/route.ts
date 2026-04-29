import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { email, code } = body

    if (!email || !code) {
      return NextResponse.json(
        { error: 'Email and code are required' },
        { status: 400 }
      )
    }

    // Check verification record in database
    const verification = await prisma.verification.findFirst({
      where: {
        identifier: email,
        value: code,
        expiresAt: {
          gt: new Date(),
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    if (!verification) {
      return NextResponse.json(
        { error: 'Invalid or expired verification code' },
        { status: 400 }
      )
    }

    // Mark user email as verified
    await prisma.user.update({
      where: { email },
      data: { emailVerified: true },
    })

    // Delete used verification code
    await prisma.verification.delete({
      where: { id: verification.id },
    })

    // Get the user to return their role
    const user = await prisma.user.findUnique({
      where: { email },
      select: { role: true },
    })

    const userRole = user?.role || 'MEMBER'

    return NextResponse.json({
      success: true,
      message: 'Email verified successfully',
      role: userRole,
    })
  } catch (error) {
    console.error('Verify email error:', error)
    return NextResponse.json(
      { error: 'Failed to verify email' },
      { status: 500 }
    )
  }
}
