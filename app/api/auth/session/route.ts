import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'

export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get('auth_token')?.value

    if (!token) {
      return NextResponse.json(null)
    }

    const session = await getSession(token)

    if (!session) {
      return NextResponse.json(null)
    }

    return NextResponse.json(session.user)
  } catch (error) {
    console.error('Session error:', error)
    return NextResponse.json(null)
  }
}
