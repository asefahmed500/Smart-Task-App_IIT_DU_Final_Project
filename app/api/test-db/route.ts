import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const userCount = await prisma.user.count()
    const hasDbUrl = !!process.env.DATABASE_URL
    const dbUrlMasked = hasDbUrl 
      ? process.env.DATABASE_URL?.replace(/:[^:]*@/, ':****@') 
      : 'MISSING'

    return NextResponse.json({ 
      status: 'success', 
      message: 'Database connection established',
      userCount,
      diagnostics: {
        hasDbUrl,
        dbUrlMasked,
        nodeEnv: process.env.NODE_ENV,
      }
    })
  } catch (error) {
    console.error('[DB Test Error]:', error)
    return NextResponse.json({ 
      status: 'error', 
      message: 'Database connection failed',
      error: error instanceof Error ? error.message : 'Unknown error',
      diagnostics: {
        hasDbUrl: !!process.env.DATABASE_URL,
        nodeEnv: process.env.NODE_ENV,
      }
    }, { status: 500 })
  }
}
