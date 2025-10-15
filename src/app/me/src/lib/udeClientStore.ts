'use client'

import { useCallback, useMemo } from 'react'
import { useUdeData } from '@/context/UdeDataContext'
import type { Action as ApiAction, ActionStatus as ApiActionStatus, UDE as ApiUde, UDEStatus as ApiUdeStatus } from '@/types/api'
import {
  ACTION_STATUSES,
  UDE_STATUSES,
  type Action,
  type ActionStatus,
  type ActivityLogEntry,
  type CompanyProfile,
  type MamSummary,
  type SetupPayload,
  type UDE,
  type UDEStatus,
  defaultCompanyProfile,
} from '@/types/legacy'

type MetricUpdate = Partial<Pick<UDE, 'baseline' | 'goal' | 'current' | 'lastWeek'>>

type LegacyState = {
  company: CompanyProfile
  udes: UDE[]
  updateMetric: (udeId: string, updates: MetricUpdate) => Promise<void>
  updateActionStatus: (udeId: string, actionId: string, status: Action['status']) => Promise<void>
  addLog: (udeId: string, message: string) => Promise<void>
  forwardStatus: (udeId: string, status: UDE['status'], actor?: string) => Promise<void>
  getDueThisWeek: () => UDE[]
  completeSetup: (payload: SetupPayload) => Promise<void>
  recordMamSummary: (summary: MamSummary) => void
  latestMamSummary: MamSummary | null
}

const UDE_STATUS_LABELS: Record<ApiUdeStatus, UDE['status']> = {
  DEFINED: 'Defined',
  ACTIVE: 'Active',
  VERIFIED: 'Verified',
  CLOSED: 'Closed',
}

const STATUS_TO_API: Record<UDE['status'], ApiUdeStatus> = {
  Defined: 'DEFINED',
  Active: 'ACTIVE',
  Verified: 'VERIFIED',
  Closed: 'CLOSED',
}

const ACTION_STATUS_LABELS: Record<ApiActionStatus, Action['status']> = {
  NOT_STARTED: 'Not Started',
  IN_PROGRESS: 'In Progress',
  DONE: 'Done',
}

const ACTION_STATUS_TO_API: Record<Action['status'], ApiActionStatus> = {
  'Not Started': 'NOT_STARTED',
  'In Progress': 'IN_PROGRESS',
  Done: 'DONE',
}

const normalizeAction = (action: ApiAction): Action => ({
  id: String(action.id),
  text: action.text,
  owner: action.owner?.name ?? 'Unassigned',
  dueDate: action.dueDate,
  status: ACTION_STATUS_LABELS[action.status],
})

const normalizeActivityLog = (entries: ApiUde['activityLog']): ActivityLogEntry[] =>
  entries.map((entry) => ({
    id: String(entry.id),
    message: entry.message,
    timestamp: entry.timestamp,
  }))

const normalizeUde = (ude: ApiUde): UDE => {
  const metric = ude.metrics[0] ?? null
  return {
    id: String(ude.id),
    title: ude.title,
    owner: ude.owner?.name ?? 'Unassigned',
    category: ude.category?.name ?? 'Uncategorized',
    costImpact: ude.costImpact,
    dueDate: ude.dueDate,
    metricName: metric?.name ?? 'Metric',
    baseline: metric?.baseline ?? 0,
    goal: metric?.goal ?? 0,
    current: metric?.current ?? 0,
    lastWeek: metric?.lastWeek ?? 0,
    status: UDE_STATUS_LABELS[ude.status],
    actions: ude.actions.map(normalizeAction),
    activityLog: normalizeActivityLog(ude.activityLog),
  }
}

const normalizeCompany = (company: ReturnType<typeof useUdeData>['company']): CompanyProfile => {
  if (!company) {
    return { ...defaultCompanyProfile }
  }

  return {
    name: company.name,
    logoUrl: company.logoUrl,
    loopStatement: company.loopStatement ?? defaultCompanyProfile.loopStatement,
    categories: company.categories.map((category) => category.name).sort((a, b) => a.localeCompare(b)),
    team: company.teamMembers.map((member) => member.name).sort((a, b) => a.localeCompare(b)),
    rhythm: {
      cadence: company.rhythmCadence ?? defaultCompanyProfile.rhythm.cadence,
      day: company.rhythmDay ?? defaultCompanyProfile.rhythm.day,
      time: company.rhythmTime ?? defaultCompanyProfile.rhythm.time,
    },
    defaults: {
      currency: company.currency ?? defaultCompanyProfile.defaults.currency,
      reviewWindow: company.reviewWindow ?? defaultCompanyProfile.defaults.reviewWindow,
    },
    addOns: {
      aiCoach: Boolean(company.addOnAiCoach),
    },
    lastSetupCompleted: company.lastSetupCompletedAt,
  }
}

const withinNextDays = (dueDate: string | null, days = 7) => {
  if (!dueDate) return false
  const due = new Date(dueDate)
  if (Number.isNaN(due.getTime())) return false
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const end = new Date(today)
  end.setDate(end.getDate() + days)
  return due >= today && due <= end
}

const toNumber = (value: string) => {
  const numeric = Number(value)
  return Number.isFinite(numeric) ? numeric : NaN
}

export const getProgressToGoal = (ude: UDE) => {
  const denominator = ude.baseline - ude.goal
  if (Math.abs(denominator) < Number.EPSILON) {
    return 0
  }
  const raw = ((ude.baseline - ude.current) / denominator) * 100
  if (!Number.isFinite(raw)) {
    return 0
  }
  return Math.max(0, Math.min(100, Math.round(raw)))
}

export const useUDEs = <T,>(selector: (state: LegacyState) => T): T => {
  const {
    company,
    udes,
    updateMetric,
    updateAction,
    addActivityLog,
    forwardStatus,
    updateCompany,
    refreshCompany,
    latestMamSummary,
    recordMamSummary,
  } = useUdeData()

  const legacyCompany = useMemo(() => normalizeCompany(company), [company])
  const legacyUdes = useMemo(() => udes.map(normalizeUde), [udes])

  const completeSetup = useCallback(
    async (payload: SetupPayload) => {
      await updateCompany({
        name: payload.name,
        logoUrl: payload.logoUrl ?? null,
        loopStatement: payload.loopStatement,
        rhythmCadence: payload.rhythm.cadence,
        rhythmDay: payload.rhythm.day,
        rhythmTime: payload.rhythm.time,
        currency: payload.defaults.currency,
        reviewWindow: payload.defaults.reviewWindow,
        addOnAiCoach: payload.addOns.aiCoach,
        categories: payload.categories,
        team: payload.team,
        lastSetupCompletedAt: new Date().toISOString(),
      })
      await refreshCompany()
    },
    [updateCompany, refreshCompany],
  )

  const updateMetricLegacy = useCallback(
    async (udeId: string, updates: MetricUpdate) => {
      const numericUdeId = toNumber(udeId)
      if (Number.isNaN(numericUdeId)) return
      const target = udes.find((entry) => entry.id === numericUdeId)
      if (!target) return
      const metric = target.metrics[0]
      if (!metric) return

      const payload: Partial<{ baseline: number; goal: number; current: number; lastWeek: number }> = {}
      if (typeof updates.baseline === 'number' && Number.isFinite(updates.baseline)) {
        payload.baseline = updates.baseline
      }
      if (typeof updates.goal === 'number' && Number.isFinite(updates.goal)) {
        payload.goal = updates.goal
      }
      if (typeof updates.current === 'number' && Number.isFinite(updates.current)) {
        payload.current = updates.current
      }
      if (typeof updates.lastWeek === 'number' && Number.isFinite(updates.lastWeek)) {
        payload.lastWeek = updates.lastWeek
      }
      if (Object.keys(payload).length === 0) return
      await updateMetric(metric.id, payload)
    },
    [udes, updateMetric],
  )

  const updateActionStatusLegacy = useCallback(
    async (udeId: string, actionId: string, status: Action['status']) => {
      const numericActionId = toNumber(actionId)
      if (Number.isNaN(numericActionId)) return
      const apiStatus = ACTION_STATUS_TO_API[status]
      if (!apiStatus) return
      await updateAction(numericActionId, { status: apiStatus })
    },
    [updateAction],
  )

  const addLogLegacy = useCallback(
    async (udeId: string, message: string) => {
      const numericUdeId = toNumber(udeId)
      if (Number.isNaN(numericUdeId)) return
      await addActivityLog(numericUdeId, message)
    },
    [addActivityLog],
  )

  const forwardStatusLegacy = useCallback(
    async (udeId: string, status: UDE['status'], actor?: string) => {
      const numericUdeId = toNumber(udeId)
      if (Number.isNaN(numericUdeId)) return
      const apiStatus = STATUS_TO_API[status]
      if (!apiStatus) return
      await forwardStatus(numericUdeId, apiStatus, actor)
    },
    [forwardStatus],
  )

  const getDueThisWeek = useCallback(() => legacyUdes.filter((ude) => withinNextDays(ude.dueDate)), [legacyUdes])

  const state = useMemo<LegacyState>(
    () => ({
      company: legacyCompany,
      udes: legacyUdes,
      updateMetric: updateMetricLegacy,
      updateActionStatus: updateActionStatusLegacy,
      addLog: addLogLegacy,
      forwardStatus: forwardStatusLegacy,
      getDueThisWeek,
      completeSetup,
      recordMamSummary,
      latestMamSummary,
    }),
    [
      legacyCompany,
      legacyUdes,
      updateMetricLegacy,
      updateActionStatusLegacy,
      addLogLegacy,
      forwardStatusLegacy,
      getDueThisWeek,
      completeSetup,
      recordMamSummary,
      latestMamSummary,
    ],
  )

  return selector(state)
}

export {
  ACTION_STATUSES,
  UDE_STATUSES,
}

export type { Action, ActionStatus, ActivityLogEntry, CompanyProfile, MamSummary, SetupPayload, UDE, UDEStatus }
