import { ActionStatus, PrismaClient, Role, UDEStatus } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const companyProfile = {
    name: 'Acme, Inc.',
    industry: 'Industrial Automation',
    loopStatement: 'Remove bottlenecks from onboarding and daily operations.',
    rhythmCadence: 'Weekly',
    rhythmDay: 'Friday',
    rhythmTime: '09:00',
    reviewWindow: 'Last 30 days',
  }

  const company = await prisma.company.upsert({
    where: { id: 1 },
    update: companyProfile,
    create: {
      id: 1,
      ...companyProfile,
    },
  })

  const category = await prisma.category.upsert({
    where: { companyId_name: { companyId: company.id, name: 'Operational Excellence' } },
    update: { name: 'Operational Excellence' },
    create: {
      name: 'Operational Excellence',
      companyId: company.id,
    },
  })

  const owner = await prisma.teamMember.upsert({
    where: { email: 'ceo@acme.test' },
    update: {
      name: 'Casey CEO',
      role: Role.OWNER,
      companyId: company.id,
    },
    create: {
      name: 'Casey CEO',
      email: 'ceo@acme.test',
      role: Role.OWNER,
      companyId: company.id,
    },
  })

  const operator = await prisma.teamMember.upsert({
    where: { email: 'ops@acme.test' },
    update: {
      name: 'Olivia Ops',
      role: Role.ADMIN,
      companyId: company.id,
    },
    create: {
      name: 'Olivia Ops',
      email: 'ops@acme.test',
      role: Role.ADMIN,
      companyId: company.id,
    },
  })

  const udeDueDate = new Date()
  udeDueDate.setDate(udeDueDate.getDate() + 30)

  const ude = await prisma.uDE.upsert({
    where: { id: 1 },
    update: {
      title: 'Reduce onboarding cycle time',
      status: UDEStatus.ACTIVE,
      costImpact: 25000,
      dueDate: udeDueDate,
      ownerId: owner.id,
      categoryId: category.id,
      companyId: company.id,
    },
    create: {
      id: 1,
      title: 'Reduce onboarding cycle time',
      status: UDEStatus.ACTIVE,
      costImpact: 25000,
      dueDate: udeDueDate,
      ownerId: owner.id,
      categoryId: category.id,
      companyId: company.id,
    },
  })

  await prisma.metric.upsert({
    where: { id: 1 },
    update: {
      name: 'Time to First Value (days)',
      baseline: 45,
      goal: 30,
      current: 38,
      lastWeek: 40,
    },
    create: {
      id: 1,
      name: 'Time to First Value (days)',
      baseline: 45,
      goal: 30,
      current: 38,
      lastWeek: 40,
      udeId: ude.id,
    },
  })

  const actionDueDate = new Date()
  actionDueDate.setDate(actionDueDate.getDate() + 14)

  await prisma.action.upsert({
    where: { id: 1 },
    update: {
      text: 'Launch refreshed onboarding welcome kit',
      status: ActionStatus.IN_PROGRESS,
      dueDate: actionDueDate,
      ownerId: operator.id,
      udeId: ude.id,
    },
    create: {
      id: 1,
      text: 'Launch refreshed onboarding welcome kit',
      status: ActionStatus.IN_PROGRESS,
      dueDate: actionDueDate,
      ownerId: operator.id,
      udeId: ude.id,
    },
  })

  await prisma.activityLog.upsert({
    where: { id: 1 },
    update: {
      message: 'Seed update: reviewed onboarding workflow and refreshed milestones.',
      udeId: ude.id,
    },
    create: {
      id: 1,
      message: 'Seed update: reviewed onboarding workflow and refreshed milestones.',
      udeId: ude.id,
    },
  })

  return `Seeded company ${company.name} with category ${category.name}, team members ${owner.name} & ${operator.name}, and UDE "${ude.title}".`
}

main()
  .then(async (summary) => {
    console.log(summary)
    await prisma.$disconnect()
    process.exit(0)
  })
  .catch(async (error) => {
    console.error('Error seeding database:', error)
    await prisma.$disconnect()
    process.exit(1)
  })

