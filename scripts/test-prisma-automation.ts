
import prisma from '../lib/prisma'

async function main() {
  try {
    console.log('Testing prisma.automationRule.findMany()...')
    const rules = await prisma.automationRule.findMany()
    console.log('Success! Found', rules.length, 'rules.')
  } catch (error) {
    console.error('Error during findMany():', error)
  } finally {
    await prisma.$disconnect()
  }
}

main()
