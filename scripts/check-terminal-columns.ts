import { prisma } from '../lib/prisma'

async function main() {
  const columns = await prisma.column.findMany({
    where: { boardId: 'cmogr3mhw0003eoyockv4js3a' },
    select: { id: true, name: true, isTerminal: true, position: true },
    orderBy: { position: 'asc' }
  })

  console.log('Columns on Development Board:')
  columns.forEach(c => {
    console.log(`- ${c.name}: isTerminal=${c.isTerminal}`)
  })
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
