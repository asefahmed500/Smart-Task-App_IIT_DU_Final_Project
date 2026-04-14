import { NextRequest, NextResponse } from 'next/server'

export async function middleware(req: NextRequest) {
  const url = req.nextUrl
  const isPublicRoute = url.pathname === '/' || url.pathname.startsWith('/landing')
  const isAuthRoute = url.pathname.startsWith('/login') || url.pathname.startsWith('/register')

  // Allow public routes
  if (isPublicRoute || isAuthRoute) {
    return NextResponse.next()
  }

  // For protected routes, check for session cookie
  // We'll do a simple cookie check - actual validation happens in page/layout
  const sessionToken = req.cookies.get('auth_token')?.value

  if (!sessionToken) {
    // Redirect to login for protected routes
    const loginUrl = new URL('/login', req.url)
    loginUrl.searchParams.set('redirect', url.pathname)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = {
  // Match all routes except for static files and API routes that handle their own auth
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - api/auth (better-auth handles its own auth)
     * - api (API routes handle their own auth)
     */
    '/((?!_next/static|_next/image|favicon.ico|api/auth|api|.*\\..*).*)',
  ],
}
