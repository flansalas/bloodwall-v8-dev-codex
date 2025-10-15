import { prisma } from '@/lib/prisma'

export async function resolveCompanyId(companyId?: number | string | null) {
  if (typeof companyId === 'number' && Number.isFinite(companyId)) {
    return companyId
  }

  if (typeof companyId === 'string' && companyId.trim().length > 0) {
    const parsed = Number.parseInt(companyId, 10)
    if (!Number.isNaN(parsed)) {
      return parsed
    }
  }

  const company = await prisma.company.findFirst({ orderBy: { id: 'asc' } })
  if (!company) {
    throw new Error('No companies found. Run the Prisma seed script.')
  }
  return company.id
}

export async function getCompanyProfile(companyId?: number) {
  const id = await resolveCompanyId(companyId)
  return prisma.company.findUnique({
    where: { id },
    include: {
      categories: { orderBy: { name: 'asc' } },
      teamMembers: { orderBy: { name: 'asc' } },
    },
  })
}
