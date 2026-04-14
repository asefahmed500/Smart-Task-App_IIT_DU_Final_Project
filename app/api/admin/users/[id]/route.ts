import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireApiRole } from '@/lib/session'

interface RouteContext {
  params: Promise<{ id: string }>
}

// PATCH /api/admin/users/:id - Update a user (Admin only)
export async function PATCH(req: NextRequest, { params }: RouteContext) {
  const authResult = await requireApiRole(['ADMIN'])
  if (authResult instanceof NextResponse) return authResult

  try {
    const { id } = await params
    const body = await req.json()
    const { name, role, isActive } = body

    // Prevent demoting the last active admin
    if (role === 'MANAGER' || role === 'MEMBER') {
      const currentAdminCount = await prisma.user.count({
        where: { role: 'ADMIN', isActive: true },
      })

      const targetUser = await prisma.user.findUnique({
        where: { id },
        select: { role: true },
      })

      if (targetUser?.role === 'ADMIN' && currentAdminCount <= 1) {
        return NextResponse.json(
          { error: 'Cannot change role: at least one admin must remain' },
          { status: 400 }
        )
      }
    }

    const updated = await prisma.user.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(role && { role }),
        ...(isActive !== undefined && { isActive }),
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        avatar: true,
        isActive: true,
        updatedAt: true,
      },
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Update user error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE /api/admin/users/:id - Soft delete a user (Admin only)
export async function DELETE(req: NextRequest, { params }: RouteContext) {
  const authResult = await requireApiRole(['ADMIN'])
  if (authResult instanceof NextResponse) return authResult

  try {
    const { id } = await params

    // Prevent deleting the last active admin
    const currentAdminCount = await prisma.user.count({
      where: { role: 'ADMIN', isActive: true },
    })

    const targetUser = await prisma.user.findUnique({
      where: { id },
      select: { role: true },
    })

    if (targetUser?.role === 'ADMIN' && currentAdminCount <= 1) {
      return NextResponse.json(
        { error: 'Cannot delete: at least one admin must remain' },
        { status: 400 }
      )
    }

    // Soft delete
    await prisma.user.update({
      where: { id },
      data: { isActive: false },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete user error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
