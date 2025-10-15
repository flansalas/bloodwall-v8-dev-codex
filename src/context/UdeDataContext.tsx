'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type {
  Action,
  ActionStatus,
  Company,
  Metric,
  Role,
  UDE,
  UDEStatus,
} from '@/types/api'
import type { MamSummary } from '@/types/legacy'
import { apiGet, apiPatch, apiPost } from '@/lib/apiClient'

type CreateUdePayload = {
  title: string
  ownerId: number
  categoryId: number
  costImpact: number
  dueDate?: string | null
  metric: {
    name: string
    baseline: number
    goal: number
    current: number
    lastWeek: number
  }
}

type UpdateUdePayload = Partial<{
  title: string
  status: UDEStatus
  ownerId: number | null
  categoryId: number | null
  costImpact: number
  dueDate: string | null
}>

type MetricPayload = Partial<{
  name: string
  baseline: number
  goal: number
  current: number
  lastWeek: number
}>

type CreateActionPayload = {
  text: string
  ownerId: number
  dueDate?: string | null
  status?: ActionStatus
}

type UpdateActionPayload = Partial<{
  text: string
  ownerId: number
  dueDate: string | null
  status: ActionStatus
}>

type UpdateCompanyPayload = Partial<{
  name: string
  logoUrl: string | null
  loopStatement: string | null
  industry: string | null
  rhythmCadence: string | null
  rhythmDay: string | null
  rhythmTime: string | null
  currency: string | null
  reviewWindow: string | null
  addOnAiCoach: boolean
  lastSetupCompletedAt: string | null
  categories: string[]
  team: Array<
    | string
    | {
        name: string
        email?: string | null
        role?: Role
      }
  >
}>

type UdeDataContextValue = {
  company: Company | null
  udes: UDE[]
  loading: boolean
  error: string | null
  refresh: () => Promise<void>
  getUdeById: (id: number) => UDE | undefined
  createUde: (payload: CreateUdePayload) => Promise<UDE>
  updateUde: (id: number, payload: UpdateUdePayload) => Promise<UDE>
  forwardStatus: (id: number, status: UDEStatus, actor?: string) => Promise<UDE>
  addMetric: (udeId: number, payload: Required<CreateUdePayload>['metric']) => Promise<Metric>
  updateMetric: (metricId: number, payload: MetricPayload) => Promise<Metric>
  addAction: (udeId: number, payload: CreateActionPayload) => Promise<Action>
  updateAction: (actionId: number, payload: UpdateActionPayload) => Promise<Action>
  addActivityLog: (udeId: number, message: string) => Promise<{ id: number; message: string; timestamp: string }>
  updateCompany: (payload: UpdateCompanyPayload) => Promise<Company>
  refreshCompany: () => Promise<void>
  latestMamSummary: MamSummary | null
  recordMamSummary: (summary: MamSummary) => void
}

const UdeDataContext = createContext<UdeDataContextValue | undefined>(undefined)

const withErrorHandling = async <T,>(operation: () => Promise<T>, onError: (error: unknown) => void) => {
  try {
    return await operation()
  } catch (error) {
    console.error(error)
    onError(error)
    throw error
  }
}

export const UdeDataProvider = ({ children }: { children: React.ReactNode }) => {
  const [company, setCompany] = useState<Company | null>(null)
  const [udes, setUdes] = useState<UDE[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [latestMamSummary, setLatestMamSummary] = useState<MamSummary | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [companyResponse, udesResponse] = await Promise.all([
        apiGet<Company>('/api/companies'),
        apiGet<{ udes: UDE[] }>('/api/udes'),
      ])
      setCompany(companyResponse)
      setUdes(udesResponse.udes)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const setUde = useCallback((updated: UDE) => {
    setUdes((prev) => {
      const exists = prev.some((entry) => entry.id === updated.id)
      if (exists) {
        return prev.map((entry) => (entry.id === updated.id ? updated : entry))
      }
      return [updated, ...prev]
    })
  }, [])

  const refresh = useCallback(async () => {
    await load()
  }, [load])

  const refreshCompany = useCallback(async () => {
    try {
      const response = await apiGet<Company>('/api/companies')
      setCompany(response)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to refresh company')
    }
  }, [])

  const getUdeById = useCallback((id: number) => udes.find((ude) => ude.id === id), [udes])

  const createUde = useCallback(
    async (payload: CreateUdePayload) =>
      withErrorHandling(async () => {
        const created = await apiPost<UDE>('/api/udes', payload)
        setUde(created)
        return created
      }, (err) => setError(err instanceof Error ? err.message : 'Failed to create UDE')),
    [setUde],
  )

  const updateUde = useCallback(
    async (id: number, payload: UpdateUdePayload) =>
      withErrorHandling(async () => {
        const updated = await apiPatch<UDE>(`/api/udes/${id}`, payload)
        setUde(updated)
        return updated
      }, (err) => setError(err instanceof Error ? err.message : 'Failed to update UDE')),
    [setUde],
  )

  const forwardStatus = useCallback(
    async (id: number, status: UDEStatus, actor?: string) =>
      withErrorHandling(async () => {
        const updated = await apiPost<UDE>(`/api/udes/${id}/forward`, { status, actor })
        setUde(updated)
        return updated
      }, (err) => setError(err instanceof Error ? err.message : 'Failed to update status')),
    [setUde],
  )

  const addMetric = useCallback(
    async (udeId: number, payload: Required<CreateUdePayload>['metric']) =>
      withErrorHandling(async () => {
        const metric = await apiPost<Metric>('/api/metrics', { udeId, ...payload })
        setUdes((prev) =>
          prev.map((ude) => (ude.id === udeId ? { ...ude, metrics: [metric, ...ude.metrics] } : ude)),
        )
        return metric
      }, (err) => setError(err instanceof Error ? err.message : 'Failed to add metric')),
    [],
  )

  const updateMetric = useCallback(
    async (metricId: number, payload: MetricPayload) =>
      withErrorHandling(async () => {
        const metric = await apiPatch<Metric>(`/api/metrics/${metricId}`, payload)
        setUdes((prev) =>
          prev.map((ude) => ({
            ...ude,
            metrics: ude.metrics.map((entry) => (entry.id === metric.id ? metric : entry)),
          })),
        )
        return metric
      }, (err) => setError(err instanceof Error ? err.message : 'Failed to update metric')),
    [],
  )

  const addAction = useCallback(
    async (udeId: number, payload: CreateActionPayload) =>
      withErrorHandling(async () => {
        const action = await apiPost<Action>('/api/actions', { udeId, ...payload })
        setUdes((prev) =>
          prev.map((ude) => (ude.id === udeId ? { ...ude, actions: [...ude.actions, action] } : ude)),
        )
        return action
      }, (err) => setError(err instanceof Error ? err.message : 'Failed to add action')),
    [],
  )

  const updateAction = useCallback(
    async (actionId: number, payload: UpdateActionPayload) =>
      withErrorHandling(async () => {
        const action = await apiPatch<Action>(`/api/actions/${actionId}`, payload)
        setUdes((prev) =>
          prev.map((ude) => ({
            ...ude,
            actions: ude.actions.map((entry) => (entry.id === action.id ? action : entry)),
          })),
        )
        return action
      }, (err) => setError(err instanceof Error ? err.message : 'Failed to update action')),
    [],
  )

  const addActivityLog = useCallback(
    async (udeId: number, message: string) =>
      withErrorHandling(async () => {
        const log = await apiPost<{ id: number; message: string; timestamp: string }>('/api/logs', {
          udeId,
          message,
        })
        setUdes((prev) =>
          prev.map((ude) =>
            ude.id === udeId ? { ...ude, activityLog: [log, ...ude.activityLog] } : ude,
          ),
        )
        return log
      }, (err) => setError(err instanceof Error ? err.message : 'Failed to add log')),
    [],
  )

  const updateCompany = useCallback(
    async (payload: UpdateCompanyPayload) =>
      withErrorHandling(async () => {
        const updated = await apiPatch<Company>('/api/companies', payload)
        setCompany(updated)
        return updated
      }, (err) => setError(err instanceof Error ? err.message : 'Failed to update company')),
    [],
  )

  const recordMamSummary = useCallback((summary: MamSummary) => {
    setLatestMamSummary(summary)
  }, [])

  const value = useMemo<UdeDataContextValue>(
    () => ({
      company,
      udes,
      loading,
      error,
      refresh,
      getUdeById,
      createUde,
      updateUde,
      forwardStatus,
      addMetric,
      updateMetric,
      addAction,
      updateAction,
      addActivityLog,
      updateCompany,
      refreshCompany,
      latestMamSummary,
      recordMamSummary,
    }),
    [
      company,
      udes,
      loading,
      error,
      refresh,
      getUdeById,
      createUde,
      updateUde,
      forwardStatus,
      addMetric,
      updateMetric,
      addAction,
      updateAction,
      addActivityLog,
      updateCompany,
      refreshCompany,
      latestMamSummary,
      recordMamSummary,
    ],
  )

  return <UdeDataContext.Provider value={value}>{children}</UdeDataContext.Provider>
}

export const useUdeData = () => {
  const context = useContext(UdeDataContext)
  if (!context) {
    throw new Error('useUdeData must be used within a UdeDataProvider')
  }
  return context
}
