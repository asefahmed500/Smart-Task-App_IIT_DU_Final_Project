import { NextRequest, NextResponse } from 'next/server'

export async function middleware(req: NextRequest) {
  const url = req.nextUrl
  const isPublicRoute = url.pathname === '/' || url.pathname.startsWith('/landing')
  const isAuthRoute = url.pathname.startsWith('/login') || url.pathname.startsWith('/register') || url.pathname.startsWith('/reset-password')

  // Allow public routes
  if (isPublicRoute || isAuthRoute) {
    return NextResponse.next()
  }

  // For protected routes, check for session cookie
  // Note: API routes handle their own auth via requireApiAuth/requireApiRole
  // This middleware only protects page routes
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
