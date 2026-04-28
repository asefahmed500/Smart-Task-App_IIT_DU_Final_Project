import { prisma } from '../lib/prisma'

async function main() {
  const automations = await prisma.automationRule.findMany({
    where: { boardId: 'cmogr3mhw0003eoyockv4js3a' },
    orderBy: { createdAt: 'desc' }
  })

  console.log('Automations on Development Board:', automations.length)
  automations.forEach(a => {
    console.log('---')
    console.log('ID:', a.id)
    console.log('Name:', a.name)
    console.log('Enabled:', a.enabled)
    console.log('Trigger:', a.trigger)
    console.log('Condition:', a.condition)
    console.log('Action:', a.action)
    console.log('Last Fired:', a.lastFiredAt)
  })

  // Also check the audit log for automation events
  const auditLogs = await prisma.auditLog.findMany({
    where: {
      boardId: 'cmogr3mhw0003eoyockv4js3a',
      action: { in: ['AUTOMATION_FIRED', 'TASK_AUTO_ASSIGNED'] }
    },
    orderBy: { createdAt: 'desc' },
    take: 5
  })

  console.log('\n\nRecent Automation Audit Logs:', auditLogs.length)
  auditLogs.forEach(log => {
    console.log('---')
    console.log('Action:', log.action)
    console.log('Entity:', log.entityId)
    console.log('Changes:', log.changes)
    console.log('Time:', log.createdAt)
  })
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
