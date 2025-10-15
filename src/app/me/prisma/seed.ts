import { PrismaClient, Role, UDEStatus, ActionStatus } from '@prisma/client'

const prisma = new PrismaClient()

const addDays = (days: number) => {
  const date = new Date()
  date.setHours(0, 0, 0, 0)
  date.setDate(date.getDate() + days)
  return date
}

export async function main() {
  try {
    await prisma.activityLog.deleteMany()
    await prisma.action.deleteMany()
    await prisma.metric.deleteMany()
    await prisma.uDE.deleteMany()
    await prisma.teamMember.deleteMany()
    await prisma.category.deleteMany()
    await prisma.company.deleteMany()

    const company = await prisma.company.create({
      data: {
        name: 'Demo Company',
        logoUrl: null,
        industry: 'Consulting',
        loopStatement: 'We eliminate waste weekly.',
        rhythmCadence: 'Weekly',
        rhythmDay: 'Monday',
        rhythmTime: '09:00',
        currency: 'USD',
      },
    })

    const [salesCategory, opsCategory, financeCategory, peopleCategory] = await Promise.all([
      prisma.category.create({ data: { name: 'Sales', companyId: company.id } }),
      prisma.category.create({ data: { name: 'Ops', companyId: company.id } }),
      prisma.category.create({ data: { name: 'Finance', companyId: company.id } }),
      prisma.category.create({ data: { name: 'People', companyId: company.id } }),
    ])

    const [alice, bob, charlie] = await Promise.all([
      prisma.teamMember.create({
        data: {
          name: 'Alice',
          email: 'alice@demo-company.com',
          role: Role.OWNER,
          companyId: company.id,
        },
      }),
      prisma.teamMember.create({
        data: {
          name: 'Bob',
          email: 'bob@demo-company.com',
          role: Role.ADMIN,
          companyId: company.id,
        },
      }),
      prisma.teamMember.create({
        data: {
          name: 'Charlie',
          email: 'charlie@demo-company.com',
          role: Role.COLLAB,
          companyId: company.id,
        },
      }),
    ])

    const udes = [
      {
        title: 'Late AR Collections',
        status: UDEStatus.ACTIVE,
        ownerId: alice.id,
        categoryId: financeCategory.id,
        costImpact: 50000,
        dueDate: addDays(14),
        metrics: [
          {
            name: 'AR Days',
            baseline: 60,
            goal: 45,
            current: 55,
            lastWeek: 57,
          },
        ],
        actions: [
          {
            text: 'Call top 5 overdue accounts',
            status: ActionStatus.IN_PROGRESS,
            ownerId: alice.id,
            dueDate: addDays(5),
          },
          {
            text: 'Send reminder emails',
            status: ActionStatus.NOT_STARTED,
            ownerId: bob.id,
            dueDate: addDays(3),
          },
        ],
        logs: ['UDE created with AR Days = 60', 'Metric updated to 57'],
      },
      {
        title: 'Job Costing Errors',
        status: UDEStatus.DEFINED,
        ownerId: bob.id,
        categoryId: opsCategory.id,
        costImpact: 20000,
        dueDate: addDays(21),
        metrics: [
          {
            name: 'Job Cost Accuracy',
            baseline: 70,
            goal: 95,
            current: 70,
            lastWeek: 70,
          },
        ],
        actions: [],
        logs: ['Baseline job costing accuracy captured at 70%.'],
      },
      {
        title: 'Slow Invoicing',
        status: UDEStatus.VERIFIED,
        ownerId: charlie.id,
        categoryId: salesCategory.id,
        costImpact: 30000,
        dueDate: addDays(7),
        metrics: [
          {
            name: 'Invoice Lag Days',
            baseline: 14,
            goal: 2,
            current: 2,
            lastWeek: 3,
          },
        ],
        actions: [],
        logs: ['UDE moved to Verified'],
      },
    ]

    for (const ude of udes) {
      await prisma.uDE.create({
        data: {
          title: ude.title,
          status: ude.status,
          ownerId: ude.ownerId,
          categoryId: ude.categoryId,
          companyId: company.id,
          costImpact: ude.costImpact,
          dueDate: ude.dueDate,
          metrics: {
            create: ude.metrics,
          },
          actions: {
            create: ude.actions,
          },
          activityLog: {
            create: ude.logs.map((message, index) => ({
              message,
              timestamp: addDays(-index),
            })),
          },
        },
      })
    }

    console.log('✅ Seeded Demo Company with 3 UDEs')
  } catch (error) {
    console.error('❌ Failed to seed database', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
