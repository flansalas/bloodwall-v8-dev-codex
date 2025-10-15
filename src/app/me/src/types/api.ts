export type Role = 'OWNER' | 'ADMIN' | 'COLLAB'
export type UDEStatus = 'DEFINED' | 'ACTIVE' | 'VERIFIED' | 'CLOSED'
export type ActionStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'DONE'

export type Category = {
  id: number
  name: string
  companyId: number
}

export type TeamMember = {
  id: number
  name: string
  email: string | null
  role: Role
  avatarUrl: string | null
  companyId: number
}

export type Metric = {
  id: number
  name: string
  baseline: number
  goal: number
  current: number
  lastWeek: number
  udeId: number
}

export type Action = {
  id: number
  text: string
  status: ActionStatus
  dueDate: string | null
  udeId: number
  ownerId: number
  owner?: TeamMember
}

export type ActivityLog = {
  id: number
  message: string
  timestamp: string
  udeId: number
}

export type UDE = {
  id: number
  title: string
  status: UDEStatus
  costImpact: number
  dueDate: string | null
  createdAt: string
  updatedAt: string
  companyId: number
  ownerId: number | null
  categoryId: number | null
  owner?: TeamMember | null
  category?: Category | null
  metrics: Metric[]
  actions: Action[]
  activityLog: ActivityLog[]
}

export type Company = {
  id: number
  name: string
  logoUrl: string | null
  industry: string | null
  loopStatement: string | null
  rhythmCadence: string | null
  rhythmDay: string | null
  rhythmTime: string | null
  currency: string | null
  reviewWindow: string | null
  addOnAiCoach: boolean
  lastSetupCompletedAt: string | null
  createdAt: string
  updatedAt: string
  categories: Category[]
  teamMembers: TeamMember[]
}
