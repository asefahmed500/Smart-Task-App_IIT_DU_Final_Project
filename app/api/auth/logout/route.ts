import { NextResponse } from "next/server"
import { getSession, logout } from "@/lib/auth-server"
import { createAuditLog } from "@/lib/create-audit-log"

export async function POST() {
  try {
    const session = await getSession()
    await logout()

    if (session) {
      await createAuditLog({
        userId: session.id,
        action: 'LOGOUT',
        details: { email: session.email },
      }).catch(() => {})
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Logout error:', error)
    return NextResponse.json({ success: false, error: 'Logout failed' }, { status: 500 })
  }
}
