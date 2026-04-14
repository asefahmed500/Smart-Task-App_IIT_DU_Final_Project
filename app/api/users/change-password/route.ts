import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { currentPassword, newPassword } = body

    if (!currentPassword || !newPassword) {
      return NextResponse.json({ error: 'Passwords required' }, { status: 400 })
    }

    // Verify current password
    const result = await auth.api.signInEmail({
      body: {
        email: body.email,
        password: currentPassword,
      },
    })

    if (!result.user) {
      return NextResponse.json({ error: 'Current password incorrect' }, { status: 401 })
    }

    // TODO: Update password in database
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
