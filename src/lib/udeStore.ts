"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export const UDE_STATUSES = ["Defined", "Active", "Verified", "Closed"] as const;
export type UDEStatus = (typeof UDE_STATUSES)[number];

export const ACTION_STATUSES = ["Not Started", "In Progress", "Done"] as const;
export type ActionStatus = (typeof ACTION_STATUSES)[number];

export type ActivityLogEntry = {
  id: string;
  message: string;
  timestamp: string;
};

export type Action = {
  id: string;
  text: string;
  owner: string;
  dueDate: string;
  status: ActionStatus;
};

export type UDE = {
  id: string;
  title: string;
  owner: string;
  category: string;
  costImpact: number;
  dueDate: string;
  metricName: string;
  baseline: number;
  goal: number;
  current: number;
  lastWeek: number;
  status: UDEStatus;
  actions: Action[];
  activityLog: ActivityLogEntry[];
};

export type CreateUDEInput = {
  title: string;
  owner: string;
  category: string;
  costImpact: number;
  dueDate?: string;
  metricName: string;
  baseline: number;
  goal: number;
  current: number;
  lastWeek: number;
};

export type CompanyProfile = {
  name: string;
  logoUrl?: string;
  loopStatement: string;
  categories: string[];
  team: string[];
  rhythm: {
    cadence: string;
    day: string;
    time: string;
  };
  defaults: {
    currency: string;
    reviewWindow: string;
  };
  addOns: {
    aiCoach: boolean;
  };
  lastSetupCompleted?: string;
};

export type SetupPayload = {
  name: string;
  logoUrl?: string;
  loopStatement: string;
  categories: string[];
  team: string[];
  rhythm: CompanyProfile["rhythm"];
  defaults: CompanyProfile["defaults"];
  addOns: CompanyProfile["addOns"];
};

export type MamSummary = {
  timestamp: string;
  agendaTotal: number;
  reviewed: number;
  verified: number;
  keptActive: number;
  needsWork: number;
  newLogged: number;
  costEliminated: number;
  costAtRisk: number;
  reviewedOwners: Record<string, number>;
  actionsCompleted: number;
  actionsOutstanding: number;
};

type InternalState = {
  udes: UDE[];
  company: CompanyProfile;
  latestMamSummary?: MamSummary | null;
};

type UDEActions = {
  addUDE: (input: CreateUDEInput) => void;
  addLog: (udeId: string, message: string) => void;
  addMetricName: (udeId: string, value: string) => void;
  updateMetric: (udeId: string, updates: Partial<Pick<UDE, "baseline" | "goal" | "current" | "lastWeek">>) => void;
  addAction: (udeId: string, text: string, owner: string, dueDate: string) => void;
  updateActionStatus: (udeId: string, actionId: string, status: ActionStatus) => void;
  updateActionDetails: (udeId: string, actionId: string, details: Partial<Pick<Action, "text" | "owner" | "dueDate">>) => void;
  forwardStatus: (udeId: string, status: UDEStatus, actor?: string) => void;
  getDueThisWeek: () => UDE[];
  completeSetup: (payload: SetupPayload) => void;
  setCompany: (updates: Partial<CompanyProfile>) => void;
  recordMamSummary: (summary: MamSummary) => void;
};

export type UDEStore = InternalState & UDEActions;

const defaultCompany: CompanyProfile = {
  name: "Bloodwall",
  logoUrl: undefined,
  loopStatement: "Keep the loop tight and transparent.",
  categories: ["Sales", "Ops", "Finance", "People"],
  team: ["Alice", "Bob", "Carol"],
  rhythm: {
    cadence: "Weekly",
    day: "Thursday",
    time: "09:30",
  },
  defaults: {
    currency: "USD",
    reviewWindow: "Weekly",
  },
  addOns: {
    aiCoach: true,
  },
  lastSetupCompleted: undefined,
};

const labelForMetricField: Record<string, string> = {
  baseline: "Baseline",
  goal: "Goal",
  current: "Current",
  lastWeek: "Last week",
};

const makeLogEntry = (message: string): ActivityLogEntry => ({
  id: crypto.randomUUID(),
  message,
  timestamp: new Date().toISOString(),
});

const storage = typeof window !== "undefined"
  ? createJSONStorage<InternalState>(() => window.localStorage)
  : undefined;

export const useUDEs = create<UDEStore>()(
  persist(
    (set, get) => ({
      udes: [],
      company: defaultCompany,
      latestMamSummary: null,

      addUDE: (input) => {
        set((state) => {
          const id = crypto.randomUUID();
          const dueDate = input.dueDate ?? new Date().toISOString().slice(0, 10);
          const newUde: UDE = {
            id,
            title: input.title,
            owner: input.owner,
            category: input.category,
            costImpact: input.costImpact,
            dueDate,
            metricName: input.metricName,
            baseline: input.baseline,
            goal: input.goal,
            current: input.current,
            lastWeek: input.lastWeek,
            status: "Defined",
            actions: [],
            activityLog: [makeLogEntry(`Created UDE ${input.title} with metric ${input.metricName}.`)],
          };
          return { udes: [newUde, ...state.udes] };
        });
      },

      addLog: (udeId, message) => {
        set((state) => ({
          udes: state.udes.map((ude) =>
            ude.id === udeId
              ? { ...ude, activityLog: [makeLogEntry(message), ...ude.activityLog] }
              : ude,
          ),
        }));
      },

      addMetricName: (udeId, value) => {
        if (!value.trim()) return;
        set((state) => ({
          udes: state.udes.map((ude) =>
            ude.id === udeId
              ? {
                  ...ude,
                  metricName: value.trim(),
                  activityLog: [makeLogEntry(`Metric renamed to ${value.trim()}.`), ...ude.activityLog],
                }
              : ude,
          ),
        }));
      },

      updateMetric: (udeId, updates) => {
        set((state) => ({
          udes: state.udes.map((ude) => {
            if (ude.id !== udeId) return ude;
            const changed: string[] = [];
            const nextUde = { ...ude };
            (Object.keys(updates) as Array<keyof typeof updates>).forEach((field) => {
              const value = updates[field];
              if (typeof value !== "number" || Number.isNaN(value)) return;
              if (nextUde[field] === value) return;
              nextUde[field] = value;
              changed.push(`${labelForMetricField[field as string] ?? field} updated to ${value}.`);
            });
            if (changed.length === 0) {
              return ude;
            }
            return {
              ...nextUde,
              activityLog: [makeLogEntry(changed.join(" ")), ...ude.activityLog],
            };
          }),
        }));
      },

      addAction: (udeId, text, owner, dueDate) => {
        const trimmed = text.trim();
        if (!trimmed) return;
        set((state) => ({
          udes: state.udes.map((ude) => {
            if (ude.id !== udeId) return ude;
            const action: Action = {
              id: crypto.randomUUID(),
              text: trimmed,
              owner: owner.trim(),
              dueDate: dueDate.trim(),
              status: "Not Started",
            };
            return {
              ...ude,
              actions: [...ude.actions, action],
              activityLog: [makeLogEntry(`Action added: ${trimmed}.`), ...ude.activityLog],
            };
          }),
        }));
      },

      updateActionStatus: (udeId, actionId, status) => {
        set((state) => ({
          udes: state.udes.map((ude) => {
            if (ude.id !== udeId) return ude;
            const actions = ude.actions.map((action) =>
              action.id === actionId ? { ...action, status } : action,
            );
            const targetAction = actions.find((action) => action.id === actionId);
            if (!targetAction) return ude;
            return {
              ...ude,
              actions,
              activityLog: [
                makeLogEntry(`Action '${targetAction.text}' → ${status}.`),
                ...ude.activityLog,
              ],
            };
          }),
        }));
      },

      updateActionDetails: (udeId, actionId, details) => {
        set((state) => ({
          udes: state.udes.map((ude) => {
            if (ude.id !== udeId) return ude;
            let updated = false;
            const actions = ude.actions.map((action) => {
              if (action.id !== actionId) return action;
              const next = { ...action };
              if (typeof details.text === "string" && details.text !== action.text) {
                next.text = details.text;
                updated = true;
              }
              if (typeof details.owner === "string" && details.owner !== action.owner) {
                next.owner = details.owner;
                updated = true;
              }
              if (typeof details.dueDate === "string" && details.dueDate !== action.dueDate) {
                next.dueDate = details.dueDate;
                updated = true;
              }
              return next;
            });
            if (!updated) return ude;
            return {
              ...ude,
              actions,
              activityLog: [makeLogEntry("Action details updated."), ...ude.activityLog],
            };
          }),
        }));
      },

      forwardStatus: (udeId, status, actor) => {
        set((state) => ({
          udes: state.udes.map((ude) => {
            if (ude.id !== udeId) return ude;
            if (ude.status === status) return ude;
            const messages: string[] = [];
            messages.push(`Status moved to ${status}${actor ? ` via ${actor}` : ""}.`);
            if (status === "Verified") {
              if (ude.goal > 0 && ude.current >= ude.goal) {
                messages.push("Goal met. Metric ready to close the loop.");
              }
            }
            if (status === "Closed") {
              messages.push(`Closed. ROI eliminated ${currencyFormatter.format(ude.costImpact)}.`);
            }
            return {
              ...ude,
              status,
              activityLog: [makeLogEntry(messages.join(" ")), ...ude.activityLog],
            };
          }),
        }));
      },

      getDueThisWeek: () => {
        const today = new Date();
        const end = new Date();
        end.setDate(today.getDate() + 7);
        const startMs = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
        const endMs = Date.UTC(end.getFullYear(), end.getMonth(), end.getDate());
        return get().udes.filter((ude) => {
          if (!ude.dueDate) return false;
          const due = new Date(ude.dueDate);
          if (Number.isNaN(due.getTime())) return false;
          const dueMs = Date.UTC(due.getFullYear(), due.getMonth(), due.getDate());
          return dueMs >= startMs && dueMs <= endMs;
        });
      },

      completeSetup: (payload) => {
        set((state) => ({
          company: {
            ...state.company,
            ...payload,
            name: payload.name,
            logoUrl: payload.logoUrl,
            loopStatement: payload.loopStatement,
            categories: payload.categories,
            team: payload.team,
            rhythm: payload.rhythm,
            defaults: payload.defaults,
            addOns: payload.addOns,
            lastSetupCompleted: new Date().toISOString(),
          },
        }));
      },

      setCompany: (updates) => {
        set((state) => ({
          company: {
            ...state.company,
            ...updates,
            rhythm: { ...state.company.rhythm, ...updates.rhythm },
            defaults: { ...state.company.defaults, ...updates.defaults },
            addOns: { ...state.company.addOns, ...updates.addOns },
          },
        }));
      },

      recordMamSummary: (summary) => {
        set({ latestMamSummary: summary });
      },
    }),
    {
      name: "bloodwall-ude-store",
      storage,
      partialize: (state) => ({
        udes: state.udes,
        company: state.company,
        latestMamSummary: state.latestMamSummary ?? null,
      }),
    },
  ),
);

export const getProgressToGoal = (ude: UDE) => {
  const denominator = ude.baseline - ude.goal;
  if (Math.abs(denominator) < Number.EPSILON) {
    return 0;
  }
  const raw = ((ude.baseline - ude.current) / denominator) * 100;
  if (!Number.isFinite(raw)) {
    return 0;
  }
  return Math.max(0, Math.min(100, Math.round(raw)));
};

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});
