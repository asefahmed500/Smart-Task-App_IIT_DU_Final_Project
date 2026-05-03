import { NextResponse } from 'next/server'
import { runNotificationChecks } from '@/utils/notification-utils'
import { getSession } from '@/lib/auth-server'

/**
 * API route to check for due date reminders and overdue tasks
 * Can be called by a cron job or manually
 * If called with a session, only checks for the current user's tasks
 * If called without a session (by cron), checks all users' tasks
 */
export async function POST() {
  try {
    // Optional: Check if this is an authenticated request or a cron job
    await getSession()
    
    // Run the notification checks
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
