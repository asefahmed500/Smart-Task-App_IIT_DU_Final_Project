import { NextRequest, NextResponse } from 'next/server'
import { decrypt } from '@/lib/auth'

// Protected routes that require authentication
const protectedRoutes = ['/dashboard', '/boards', '/settings', '/admin', '/manager', '/member']
// Public routes that should not be accessible when authenticated
const publicRoutes = ['/login', '/signup', '/']

export default async function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname
  const isProtectedRoute = protectedRoutes.some(route => path.startsWith(route))
  const isPublicRoute = publicRoutes.includes(path)

  const cookie = req.cookies.get('session')?.value
  let session = null

  if (cookie) {
    try {
      session = await decrypt(cookie)
    } catch (error) {
      console.error('Failed to decrypt session', error)
    }
  }

  // Redirect to login if accessing a protected route without session
  if (isProtectedRoute && !session) {
    return NextResponse.redirect(new URL('/login', req.nextUrl))
  }

  // Redirect to dashboard if accessing login/signup with valid session
  if (isPublicRoute && session && (path === '/login' || path === '/signup')) {
    return NextResponse.redirect(new URL('/dashboard', req.nextUrl))
  }

  // RBAC Protections (Hierarchical)
  if (path.startsWith('/admin') && session?.role !== 'ADMIN') {
    return NextResponse.redirect(new URL('/dashboard', req.nextUrl))
  }

  if (path.startsWith('/manager') && !['ADMIN', 'MANAGER'].includes(session?.role || '')) {
    return NextResponse.redirect(new URL('/dashboard', req.nextUrl))
  }

  if (path.startsWith('/member') && !['ADMIN', 'MANAGER', 'MEMBER'].includes(session?.role || '')) {
    return NextResponse.redirect(new URL('/dashboard', req.nextUrl))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|.*\\.png$).*)'],
}
