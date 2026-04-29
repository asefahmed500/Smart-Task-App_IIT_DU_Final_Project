'use client'

import { useSession as useBetterAuthSession } from './auth-client'

/**
 * Drop-in replacement for the old useGetSessionQuery from authApi
 * Uses Better Auth's useSession hook internally
 *
 * Maps Better Auth session structure to the old API structure:
 * - Better Auth: { user: { id, email, name, role, avatar }, ... }
 * - Old API: { user: { id, email, name, role, avatar }, token: string }
 *
 * For backward compatibility, we flatten the user properties to the top level:
 * - data.id === data.user.id
 * - data.role === data.user.role
 * - data.name === data.user.name
 * - etc.
 */
export function useGetSessionQuery() {
  const { data, isPending, isRefetching, error } = useBetterAuthSession()

  const session = data ? {
    // Keep the user object for components that expect it
    user: data.user,
    // Flatten user properties to top level for backward compatibility
    id: data.user.id,
    email: data.user.email,
    name: data.user.name,
    role: (data.user as any).role || 'MEMBER',
    avatar: (data.user as any).avatar || (data.user as any).image || null,
    // Better Auth doesn't return a token, it uses httpOnly cookies
    token: null,
  } : null

  return {
    data: session,
    isLoading: isPending,
    isError: !!error,
    error,
  }
}

/**
 * Direct hook to get session data from Better Auth
 * Returns the Better Auth session structure
 */
export function useSession() {
  return useBetterAuthSession()
}
