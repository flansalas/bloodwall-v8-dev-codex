// src/app/api/health/route.ts
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const companies = await prisma.company.count()
  return NextResponse.json({ ok: true, companies })
}