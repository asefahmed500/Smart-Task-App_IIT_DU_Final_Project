'use server'

import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { encrypt, decrypt } from './auth'
import prisma from './prisma'
import type { JWTPayload, LoginInput } from './auth'

export async function login(payload: LoginInput) {
  const user = await prisma.user.findUnique({
    where: { id: payload.id },
    select: { passwordVersion: true, isActive: true },
  })

  if (!user || !user.isActive) {
    throw new Error('Account is deactivated or not found')
  }

  const token = await encrypt({
    ...payload,
    passwordVersion: user.passwordVersion,
  } as JWTPayload)

  const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
  const cookieStore = await cookies()
  cookieStore.set('session', token, { 
    expires, 
    httpOnly: true, 
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/'
  })

  return token
}

export async function logout() {
  const cookieStore = await cookies()
  cookieStore.set('session', '', { expires: new Date(0), path: '/' })
}

export async function getSession() {
  const cookieStore = await cookies()
  const session = cookieStore.get('session')?.value
  if (!session) return null
  try {
    const payload = await decrypt(session)
    const user = await prisma.user.findUnique({
      where: { id: payload.id },
      select: { isActive: true, passwordVersion: true },
    })
    if (!user || !user.isActive || user.passwordVersion !== payload.passwordVersion) {
      return null
    }
    return payload
  } catch {
    return null
  }
}

export async function updateSession(request: NextRequest) {
  const session = request.cookies.get('session')?.value
  if (!session) return

  try {
    const parsed = await decrypt(session)
    const user = await prisma.user.findUnique({
      where: { id: parsed.id },
      select: { isActive: true, passwordVersion: true },
    })
    if (!user || !user.isActive || user.passwordVersion !== parsed.passwordVersion) {
      const res = NextResponse.next()
      res.cookies.set({ name: 'session', value: '', expires: new Date(0), path: '/' })
      return res
    }

    const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    const res = NextResponse.next()
    res.cookies.set({
      name: 'session',
      value: await encrypt({ ...parsed, passwordVersion: user.passwordVersion }),
      httpOnly: true,
      expires: expires,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
    })
    return res
  } catch {
    return
  }
}
