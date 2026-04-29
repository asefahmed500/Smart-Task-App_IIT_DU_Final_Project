import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'

export const runtime = 'nodejs'

export async function middleware(req: NextRequest) {
  const url = req.nextUrl
  const isPublicRoute = url.pathname === '/' || url.pathname.startsWith('/landing')
  const isAuthRoute =
    url.pathname.startsWith('/login') ||
    url.pathname.startsWith('/register') ||
    url.pathname.startsWith('/reset-password') ||
    url.pathname.startsWith('/verify-email') ||
    url.pathname.startsWith('/verify-email-sent') ||
    url.pathname.startsWith('/reset-email-sent')

  // Allow public routes
  if (isPublicRoute || isAuthRoute) {
    return NextResponse.next()
  }

  // For protected routes, check session using Better Auth
  // Note: API routes handle their own auth via requireApiAuth/requireApiRole
  // This middleware only protects page routes
  try {
    const session = await auth.api.getSession({
      headers: req.headers,
    })

    if (!session) {
      // Redirect to login for protected routes
      const loginUrl = new URL('/login', req.url)
      loginUrl.searchParams.set('redirect', url.pathname)
      return NextResponse.redirect(loginUrl)
    }

    return NextResponse.next()
  } catch {
    // If session check fails, redirect to login
    const loginUrl = new URL('/login', req.url)
    loginUrl.searchParams.set('redirect', url.pathname)
    return NextResponse.redirect(loginUrl)
  }
}

export const config = {
  // Match all routes except:
  // - Static files (_next/static, _next/image)
  // - favicon.ico
  // - API routes (they handle their own auth via requireApiAuth/requireApiRole)
  // - Files with extensions
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - api (API routes handle their own authentication)
     * - Files with extensions (images, fonts, etc.)
     */
    '/((?!_next/static|_next/image|favicon.ico|api|.*\\..*).*)',
  ],
}
