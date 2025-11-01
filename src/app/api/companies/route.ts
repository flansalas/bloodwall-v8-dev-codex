import { NextRequest, NextResponse } from 'next/server'
import { isReadOnly } from '@/src/lib/runtimeFlags'
import { Role } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { getCompanyProfile, resolveCompanyId } from '@/lib/companyService'
import { requireAdmin } from '../_lib/adminAuth'

const roleFromInput = (value: unknown) => {
  if (typeof value !== 'string') return Role.COLLAB
  const upper = value.toUpperCase()
  if (upper === 'OWNER') return Role.OWNER
  if (upper === 'ADMIN') return Role.ADMIN
  return Role.COLLAB
}

export async function GET(request: NextRequest) {
  try {
    const companyIdParam = request.nextUrl.searchParams.get('companyId')
    const companyId = await resolveCompanyId(companyIdParam)
    const company = await getCompanyProfile(companyId)
    return NextResponse.json(company)
  } catch (error) {
    console.error('[GET /api/companies]', error)
    return NextResponse.json({ error: (error as Error).message }, { status: 500 })
  }
}

export async function POST(req: Request) {
  const denied = requireAdmin(req as any);
  if (denied) return denied;
  if (isReadOnly(req)) {
    return NextResponse.json(
      { error: 'Read-only mode: writes are disabled on this deployment.' },
      { status: 403 }
    )
  }
  try {
    const body = await req.json()
    const company = await prisma.company.create({
      data: {
        name: String(body.name ?? 'Untitled Company'),
        logoUrl: body.logoUrl ?? null,
        industry: body.industry ?? null,
        loopStatement: body.loopStatement ?? null,
        rhythmCadence: body.rhythmCadence ?? null,
        rhythmDay: body.rhythmDay ?? null,
        rhythmTime: body.rhythmTime ?? null,
        currency: body.currency ?? 'USD',
        reviewWindow: body.reviewWindow ?? null,
        addOnAiCoach: Boolean(body.addOnAiCoach),
        lastSetupCompletedAt: body.lastSetupCompletedAt ? new Date(body.lastSetupCompletedAt) : null,
      },
    })

    if (Array.isArray(body.categories)) {
      const names = body.categories.map((name: unknown) => (typeof name === 'string' ? name.trim() : '')).filter(Boolean)
      await prisma.category.createMany({
        data: names.map((name: string) => ({ name, companyId: company.id })),
        skipDuplicates: true,
      })
    }

    if (Array.isArray(body.team)) {
      const members = body.team.map((raw: any) => {
        if (typeof raw === 'string') {
          return { name: raw, email: null, role: Role.COLLAB }
        }
        return {
          name: String(raw.name ?? '').trim(),
          email: typeof raw.email === 'string' ? raw.email : null,
          role: roleFromInput(raw.role),
        }
      })
      const filtered = members.filter((member) => member.name.length > 0)
      if (filtered.length > 0) {
        await prisma.teamMember.createMany({
          data: filtered.map((member) => ({
            name: member.name,
            email: member.email,
            role: member.role,
            companyId: company.id,
          })),
          skipDuplicates: true,
        })
      }
    }

    const profile = await getCompanyProfile(company.id)
    return NextResponse.json(profile, { status: 201 })
  } catch (error) {
    console.error('[POST /api/companies]', error)
    return NextResponse.json({ error: (error as Error).message }, { status: 500 })
  }
}

export async function PATCH(req: Request) {
  const denied = requireAdmin(req as any);
  if (denied) return denied;
  if (isReadOnly(req)) {
    return NextResponse.json(
      { error: 'Read-only mode: writes are disabled on this deployment.' },
      { status: 403 }
    )
  }
  try {
    const body = await req.json()
    const companyId = await resolveCompanyId(body.companyId)

    await prisma.company.update({
      where: { id: companyId },
      data: {
        name: typeof body.name === 'string' ? body.name : undefined,
        logoUrl: 'logoUrl' in body ? body.logoUrl ?? null : undefined,
        industry: 'industry' in body ? body.industry ?? null : undefined,
        loopStatement: 'loopStatement' in body ? body.loopStatement ?? null : undefined,
        rhythmCadence: 'rhythmCadence' in body ? body.rhythmCadence ?? null : undefined,
        rhythmDay: 'rhythmDay' in body ? body.rhythmDay ?? null : undefined,
        rhythmTime: 'rhythmTime' in body ? body.rhythmTime ?? null : undefined,
        currency: typeof body.currency === 'string' ? body.currency : undefined,
        reviewWindow: 'reviewWindow' in body ? body.reviewWindow ?? null : undefined,
        addOnAiCoach: typeof body.addOnAiCoach === 'boolean' ? body.addOnAiCoach : undefined,
        lastSetupCompletedAt: body.lastSetupCompletedAt ? new Date(body.lastSetupCompletedAt) : undefined,
      },
    })

    if (Array.isArray(body.categories)) {
      const incoming = body.categories
        .map((name: unknown) => (typeof name === 'string' ? name.trim() : ''))
        .filter((name: string) => name.length > 0)

      const existing = await prisma.category.findMany({ where: { companyId } })
      const existingNames = new Set(existing.map((category) => category.name))
      const incomingSet = new Set(incoming)

      const toDelete = existing.filter((category) => !incomingSet.has(category.name))
      if (toDelete.length > 0) {
        await prisma.category.deleteMany({ where: { id: { in: toDelete.map((category) => category.id) } } })
      }

      const toCreate = incoming.filter((name) => !existingNames.has(name))
      if (toCreate.length > 0) {
        await prisma.category.createMany({
          data: toCreate.map((name) => ({ name, companyId })),
          skipDuplicates: true,
        })
      }
    }

    if (Array.isArray(body.team)) {
      const existing = await prisma.teamMember.findMany({ where: { companyId } })
      const keepIds: number[] = []

      for (const raw of body.team) {
        const name = typeof raw === 'string' ? raw.trim() : String(raw?.name ?? '').trim()
        if (!name) continue
        const email = typeof raw?.email === 'string' ? raw.email : null
        const role = roleFromInput(raw?.role)

        const match = existing.find((member) => member.name === name)
        if (match) {
          await prisma.teamMember.update({
            where: { id: match.id },
            data: { email, role },
          })
          keepIds.push(match.id)
        } else {
          const created = await prisma.teamMember.create({
            data: {
              name,
              email,
              role,
              companyId,
            },
          })
          keepIds.push(created.id)
        }
      }

      const toRemove = existing.filter((member) => !keepIds.includes(member.id))
      if (toRemove.length > 0) {
        await prisma.teamMember.deleteMany({ where: { id: { in: toRemove.map((member) => member.id) } } })
      }
    }

    const profile = await getCompanyProfile(companyId)
    return NextResponse.json(profile)
  } catch (error) {
    console.error('[PATCH /api/companies]', error)
    return NextResponse.json({ error: (error as Error).message }, { status: 500 })
  }
}
