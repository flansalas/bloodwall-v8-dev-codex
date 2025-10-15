# Bloodwall App – MVP Compass Doc

## Purpose
MVP Phase 1 delivers a thin slice: **Setup Module → Dashboard → UDE Wall**. Capture UDEs, assign owners, track progress. AI helpers, MAM Mode, and Analytics come later.

## Stack
- Next.js (app router) + React + TailwindCSS
- Prisma ORM with SQLite (dev) / Postgres (prod)
- No auth in MVP (single admin)

## Data Models
**Company**: id, name, logoUrl, currency, costImpactScale, mamDayOfWeek, mamTime  
**TeamMember**: id, name, email, role, avatarUrl, companyId  
**Category**: id, name, companyId  
**UDE**: id, title, costImpact, status, dueDate, companyId, ownerId, categoryId  
**Action**: id, udeId, description, assigneeId, dueDate, status  
**Metric**: id, udeId, name, baseline, goal, current, reportsJson

## Journeys
1) Setup → save Company, Categories, Team  
2) Add UDE → appears in “Defined”  
3) Drag UDE across Kanban: Defined → Active → Verified → Closed

## Design
Jobs/Ive minimalism: pill buttons, whitespace, soft shadows, smooth drag-drop.

## Done for MVP
- Setup works and persists
- Dashboard shows branding + KPI placeholders
- UDE Wall with drag/drop + Quick Add
- Expanded UDE Card with basic Actions + one Metric

## Database
- Dev uses SQLite via `.env`: `DATABASE_URL="file:./prisma/dev.db"`
- To switch to Postgres in prod:
  1. Update `prisma/schema.prisma` with `provider = "postgresql"` and point `DATABASE_URL` at your Postgres URI.
  2. Run `npx prisma generate && prisma migrate diff` locally, then `prisma migrate deploy` in prod.
