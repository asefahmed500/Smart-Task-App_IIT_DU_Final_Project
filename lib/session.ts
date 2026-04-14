import { cookies } from 'next/headers'
import { getSession } from './auth'
import { redirect } from 'next/navigation'
import { NextResponse } from 'next/server'

export interface SessionUser {
  user: {
    id: string
    email: string
    name: string | null
    role: 'ADMIN' | 'MANAGER' | 'MEMBER'
    avatar: string | null
  }
  token: string
}

export async function getServerSession(): Promise<SessionUser | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get('auth_token')?.value

  if (!token) {
    return null
  }

  const session = await getSession(token)
  return session
}

/**
 * For use in Server Components / page layouts – redirects to /login if unauthenticated.
 */
export async function requireAuth(): Promise<SessionUser> {
  const session = await getServerSession()

  if (!session) {
    redirect('/login')
  }

  return session
}

/**
 * For use in Server Components – redirects to /dashboard if role is insufficient.
 */
export async function requireRole(
  roles: ('ADMIN' | 'MANAGER' | 'MEMBER')[]
): Promise<SessionUser> {
  const session = await requireAuth()

  if (!roles.includes(session.user.role)) {
    redirect('/dashboard')
  }

  return session
}

/**
 * For use in API Route Handlers – returns null (caller returns 401/403) instead of redirecting.
 */
export async function getApiSession(): Promise<SessionUser | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get('auth_token')?.value
  if (!token) return null
  return getSession(token)
}

/**
 * Enforces auth in an API route. Returns 401 response if not authenticated, otherwise the session.
 */
export async function requireApiAuth(): Promise<
  SessionUser | NextResponse
> {
  const session = await getApiSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  return session
}

/**
 * Enforces role in an API route. Returns 401/403 response if check fails, otherwise the session.
 */
export async function requireApiRole(
  roles: ('ADMIN' | 'MANAGER' | 'MEMBER')[]
): Promise<SessionUser | NextResponse> {
  const session = await getApiSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (!roles.includes(session.user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  return session
}
