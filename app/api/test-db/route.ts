import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const userCount = await prisma.user.count()
    return NextResponse.json({ 
      status: 'success', 
      message: 'Database connection established',
      userCount 
    })
  } catch (error) {
    console.error('[DB Test Error]:', error)
    return NextResponse.json({ 
      status: 'error', 
      message: 'Database connection failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
