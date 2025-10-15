export const UDE_STATUSES = ["Defined", "Active", "Verified", "Closed"] as const
export type UDEStatus = (typeof UDE_STATUSES)[number]

export const ACTION_STATUSES = ["Not Started", "In Progress", "Done"] as const
export type ActionStatus = (typeof ACTION_STATUSES)[number]

export type ActivityLogEntry = {
  id: string
  message: string
  timestamp: string
}

export type Action = {
  id: string
  text: string
  owner: string
  dueDate: string | null
  status: ActionStatus
}

export type UDE = {
  id: string
  title: string
  owner: string
  category: string
  costImpact: number
  dueDate: string | null
  metricName: string
  baseline: number
  goal: number
  current: number
  lastWeek: number
  status: UDEStatus
  actions: Action[]
  activityLog: ActivityLogEntry[]
}

export type CompanyProfile = {
  name: string
  logoUrl?: string | null
  loopStatement: string
  categories: string[]
  team: string[]
  rhythm: {
    cadence: string
    day: string
    time: string
  }
  defaults: {
    currency: string
    reviewWindow: string
  }
  addOns: {
    aiCoach: boolean
  }
  lastSetupCompleted?: string | null
}

export type SetupPayload = {
  name: string
  logoUrl?: string | null
  loopStatement: string
  categories: string[]
  team: string[]
  rhythm: CompanyProfile['rhythm']
  defaults: CompanyProfile['defaults']
  addOns: CompanyProfile['addOns']
}

export type MamSummary = {
  timestamp: string
  agendaTotal: number
  reviewed: number
  verified: number
  keptActive: number
  needsWork: number
  newLogged: number
  costEliminated: number
  costAtRisk: number
  reviewedOwners: Record<string, number>
  actionsCompleted: number
  actionsOutstanding: number
}

export const defaultCompanyProfile: CompanyProfile = {
  name: 'Bloodwall',
  logoUrl: null,
  loopStatement: 'Keep the loop tight and transparent.',
  categories: ['Sales', 'Ops', 'Finance', 'People'],
  team: ['Alice', 'Bob', 'Carol'],
  rhythm: {
    cadence: 'Weekly',
    day: 'Thursday',
    time: '09:30',
  },
  defaults: {
    currency: 'USD',
    reviewWindow: 'Weekly',
  },
  addOns: {
    aiCoach: true,
  },
  lastSetupCompleted: null,
}
