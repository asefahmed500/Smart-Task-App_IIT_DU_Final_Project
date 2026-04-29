import { NextRequest, NextResponse } from 'next/server'

export async function middleware(req: NextRequest) {
  // Minimal middleware - auth is handled by API routes and client-side checks
  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|api|.*\\..*).*)',
  ],
}
