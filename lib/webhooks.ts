import { prisma } from './prisma'
import crypto from 'crypto'

export async function triggerWebhooks(boardId: string, event: string, payload: any) {
  try {
    const webhooks = await prisma.webhook.findMany({
      where: {
        boardId,
        isActive: true,
        events: {
          has: event
        }
      }
    })

    const deliveryPromises = webhooks.map(async (webhook) => {
      const body = JSON.stringify({
        event,
        timestamp: new Date().toISOString(),
        payload
      })

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'X-SmartTask-Event': event,
      }

      if (webhook.secret) {
        const signature = crypto
          .createHmac('sha256', webhook.secret)
          .update(body)
          .digest('hex')
        headers['X-SmartTask-Signature'] = signature
      }

      try {
        const response = await fetch(webhook.url, {
          method: 'POST',
          headers,
          body,
        })

        if (!response.ok) {
          console.error(`Webhook delivery failed for ${webhook.url}: ${response.statusText}`)
        }
      } catch (error) {
        console.error(`Webhook delivery error for ${webhook.url}:`, error)
      }
    })

    await Promise.allSettled(deliveryPromises)
  } catch (error) {
    console.error('Failed to trigger webhooks:', error)
  }
}
