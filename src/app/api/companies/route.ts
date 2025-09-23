// src/app/api/companies/route.ts
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(req: Request) {
  try {
    const data = await req.json()
    const company = await prisma.company.create({
      data: {
        name: data.name,
        logoUrl: data.logoUrl ?? null,
        currency: data.currency ?? 'USD',
      },
    })
    return NextResponse.json(company, { status: 201 })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Failed to create company' }, { status: 500 })
  }
}