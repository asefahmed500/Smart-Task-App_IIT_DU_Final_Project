import { NextResponse } from 'next/server'
import { runNotificationChecks } from '@/utils/notification-utils'

export async function POST() {
  try {
    const result = await runNotificationChecks()

    return NextResponse.json({
      success: true,
      ...result,
    })
  } catch (error) {
    console.error('Error checking notifications:', error)
    return NextResponse.json(
      { error: 'Failed to check notifications' },
      { status: 500 }
    )
  }
}
