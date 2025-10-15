"use client";

import { useEffect, useMemo, useState } from "react";
import Card from "@/components/ui/Card";
import Button, { buttonClasses } from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import Input from "@/components/ui/Input";
import { useUdeData } from "@/context/UdeDataContext";
import type { Action, ActionStatus, Metric, TeamMember, UDEStatus } from "@/types/api";
import { getProgressToGoal } from "@/lib/metrics";

const ACTION_STATUS_OPTIONS: { value: ActionStatus; label: string }[] = [
  { value: "NOT_STARTED", label: "Not Started" },
  { value: "IN_PROGRESS", label: "In Progress" },
  { value: "DONE", label: "Done" },
];

const STATUS_LABEL: Record<UDEStatus, string> = {
  DEFINED: "Defined",
  ACTIVE: "Active",
  VERIFIED: "Verified",
  CLOSED: "Closed",
};

const formatDate = (value?: string | null) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

type MetricDraft = {
  id: number | null;
  name: string;
  baseline: string;
  goal: string;
  current: string;
  lastWeek: string;
};

type ActionDraft = {
  text: string;
  ownerId: string;
  dueDate: string;
};

type Decision = "verify" | "keep-active" | "needs-work";

type UDEDetailCardProps = {
  udeId: number;
  disableEditing?: boolean;
  showDecisionFooter?: boolean;
  onDecision?: (decision: Decision, status: UDEStatus) => void;
  lockTargets?: boolean;
};

const initialActionDraft: ActionDraft = { text: "", ownerId: "", dueDate: "" };

const iconForLog = (message: string) => {
  const lower = message.toLowerCase();
  if (lower.includes("metric")) return "📊";
  if (lower.includes("action")) return "✅";
  if (lower.includes("moved") || lower.includes("status")) return "🔄";
  return "📝";
};

const actionStatusTone = (status: ActionStatus) => {
  switch (status) {
    case "IN_PROGRESS":
      return "active" as const;
    case "DONE":
      return "verified" as const;
    default:
      return "default" as const;
  }
};

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

const UDEDetailCard = ({ udeId, disableEditing = false, showDecisionFooter = false, onDecision, lockTargets = false }: UDEDetailCardProps) => {
  const {
    getUdeById,
    company,
    updateMetric,
    addMetric,
    addAction,
    updateAction,
    addActivityLog,
    forwardStatus,
  } = useUdeData();

  const ude = getUdeById(udeId);
  const teamMembers = company?.teamMembers ?? [];
  const primaryMetric: Metric | null = ude?.metrics[0] ?? null;

  const [metricDraft, setMetricDraft] = useState<MetricDraft | null>(null);
  const [actionDrafts, setActionDrafts] = useState<Record<number, ActionDraft>>({});
  const [newAction, setNewAction] = useState<ActionDraft>(initialActionDraft);
  const [needsWorkReason, setNeedsWorkReason] = useState("");
  const [validationMessage, setValidationMessage] = useState<string | null>(null);
  const [savingStatus, setSavingStatus] = useState(false);

  useEffect(() => {
    if (!ude) return;
    setMetricDraft({
      id: primaryMetric?.id ?? null,
      name: primaryMetric?.name ?? "",
      baseline: primaryMetric ? primaryMetric.baseline.toString() : "0",
      goal: primaryMetric ? primaryMetric.goal.toString() : "0",
      current: primaryMetric ? primaryMetric.current.toString() : "0",
      lastWeek: primaryMetric ? primaryMetric.lastWeek.toString() : "0",
    });
    const drafts: Record<number, ActionDraft> = {};
    ude.actions.forEach((action) => {
      drafts[action.id] = {
        text: action.text,
        ownerId: String(action.ownerId),
        dueDate: action.dueDate ?? "",
      };
    });
    setActionDrafts(drafts);
    setNeedsWorkReason("");
    setValidationMessage(null);
    setNewAction(initialActionDraft);
  }, [ude, primaryMetric?.id]);

  const orderedLog = useMemo(() => {
    if (!ude) return [];
    return [...ude.activityLog].sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1));
  }, [ude]);

  if (!ude || !metricDraft) {
    return (
      <Card className="rounded-[32px] text-center text-sm text-slate-500">
        Unable to load that UDE. It might have been removed.
      </Card>
    );
  }

  const ownerName = ude.owner?.name ?? "Unassigned";
  const categoryName = ude.category?.name ?? "Uncategorized";
  const progress = getProgressToGoal(primaryMetric);
  const canVerify = primaryMetric ? primaryMetric.goal > 0 && primaryMetric.current >= primaryMetric.goal : false;
  const canKeepActive = ude.status === "ACTIVE";
  const actionsTotal = ude.actions.length;
  const actionsDone = ude.actions.filter((action) => action.status === "DONE").length;

  const handleMetricDraftChange = (field: keyof Omit<MetricDraft, "id">, value: string) => {
    setMetricDraft((prev) => (prev ? { ...prev, [field]: value } : prev));
  };

  const commitMetricField = async (field: keyof Omit<MetricDraft, "id">) => {
    if (disableEditing || !metricDraft) return;
    const currentMetricId = metricDraft.id;
    if (!currentMetricId) {
      // create metric if missing
      await addMetric(ude.id, {
        name: metricDraft.name || "Metric",
        baseline: Number(metricDraft.baseline) || 0,
        goal: Number(metricDraft.goal) || 0,
        current: Number(metricDraft.current) || 0,
        lastWeek: Number(metricDraft.lastWeek) || 0,
      });
      return;
    }
    if (field === "name") {
      await updateMetric(currentMetricId, { name: metricDraft.name });
      return;
    }
    if (lockTargets && (field === "baseline" || field === "goal")) {
      return;
    }
    const numeric = Number(metricDraft[field]);
    if (Number.isNaN(numeric)) return;
    await updateMetric(currentMetricId, { [field]: numeric });
  };

  const handleActionDraftChange = (action: Action, field: keyof ActionDraft, value: string) => {
    setActionDrafts((prev) => ({
      ...prev,
      [action.id]: {
        ...(prev[action.id] ?? {
          text: action.text,
          ownerId: String(action.ownerId),
          dueDate: action.dueDate ?? "",
        }),
        [field]: value,
      },
    }));
  };

  const commitActionDraft = async (action: Action, field: keyof ActionDraft) => {
    if (disableEditing) return;
    const draft = actionDrafts[action.id];
    if (!draft) return;
    const payload: Partial<Action> = {};
    if (field === "text" && draft.text !== action.text) {
      payload.text = draft.text;
    }
    if (field === "ownerId" && draft.ownerId !== String(action.ownerId)) {
      const ownerId = Number.parseInt(draft.ownerId, 10);
      if (!Number.isNaN(ownerId)) {
        payload.ownerId = ownerId;
      }
    }
    if (field === "dueDate") {
      payload.dueDate = draft.dueDate || null;
    }
    if (Object.keys(payload).length === 0) return;
    await updateAction(action.id, payload);
  };

  const updateActionStatus = async (action: Action, status: ActionStatus) => {
    if (disableEditing || action.status === status) return;
    await updateAction(action.id, { status });
  };

  const handleAddAction = async () => {
    if (disableEditing) return;
    const text = newAction.text.trim();
    if (!text) {
      setValidationMessage("Add a description before saving the action.");
      return;
    }
    if (!newAction.ownerId) {
      setValidationMessage("Select an owner before saving the action.");
      return;
    }
    await addAction(ude.id, {
      text,
      ownerId: Number.parseInt(newAction.ownerId, 10),
      dueDate: newAction.dueDate || null,
    });
    setNewAction(initialActionDraft);
    setValidationMessage(null);
  };

  const handleDecision = async (decision: Decision) => {
    if (disableEditing) return;
    if (decision === "verify") {
      if (!canVerify) {
        setValidationMessage("Metric must be at or above goal before verifying.");
        return;
      }
      setSavingStatus(true);
      await forwardStatus(ude.id, "VERIFIED", "Detail view");
      setSavingStatus(false);
      onDecision?.("verify", "VERIFIED");
      return;
    }
    if (decision === "keep-active") {
      await addActivityLog(ude.id, `Reviewed and remains Active – ${primaryMetric?.name ?? "Metric"} ${primaryMetric?.current ?? ""}`);
      onDecision?.("keep-active", ude.status);
      return;
    }
    const reason = needsWorkReason.trim();
    if (!reason) {
      setValidationMessage("Add a short note before flagging needs work.");
      return;
    }
    await addActivityLog(ude.id, `Needs Work: ${reason}`);
    setNeedsWorkReason("");
    onDecision?.("needs-work", ude.status);
  };

  return (
    <div className="space-y-8">
      <Card className="rounded-[32px] p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">UDE</p>
            <h1 className="text-2xl font-semibold text-slate-900">{ude.title}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-500">
              <span className="rounded-full bg-slate-100 px-3 py-1">Owner {ownerName}</span>
              <span className="rounded-full bg-slate-100 px-3 py-1">{categoryName}</span>
              <span className="rounded-full bg-slate-100 px-3 py-1">{currencyFormatter.format(ude.costImpact)} / yr</span>
              <span className="rounded-full bg-slate-100 px-3 py-1">Due {formatDate(ude.dueDate)}</span>
            </div>
          </div>
          <Badge tone={actionStatusTone(ude.status === "VERIFIED" ? "DONE" : ude.status === "ACTIVE" ? "IN_PROGRESS" : "NOT_STARTED")}>
            {STATUS_LABEL[ude.status]}
          </Badge>
        </div>
      </Card>

      <Card className="space-y-6 rounded-[32px] p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Metric</h2>
          <span className="text-xs uppercase tracking-wide text-slate-400">{progress}% to goal</span>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Metric Name</p>
            <Input
              value={metricDraft.name}
              onChange={(event) => handleMetricDraftChange("name", event.target.value)}
              onBlur={() => commitMetricField("name")}
              disabled={disableEditing}
            />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Baseline</p>
            <Input
              value={metricDraft.baseline}
              onChange={(event) => handleMetricDraftChange("baseline", event.target.value)}
              onBlur={() => commitMetricField("baseline")}
              disabled={!(!disableEditing && !lockTargets)}
              type="number"
              step="any"
            />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Goal</p>
            <Input
              value={metricDraft.goal}
              onChange={(event) => handleMetricDraftChange("goal", event.target.value)}
              onBlur={() => commitMetricField("goal")}
              disabled={!(!disableEditing && !lockTargets)}
              type="number"
              step="any"
            />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Current</p>
            <Input
              value={metricDraft.current}
              onChange={(event) => handleMetricDraftChange("current", event.target.value)}
              onBlur={() => commitMetricField("current")}
              disabled={disableEditing}
              type="number"
              step="any"
            />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Last Week</p>
            <Input
              value={metricDraft.lastWeek}
              onChange={(event) => handleMetricDraftChange("lastWeek", event.target.value)}
              onBlur={() => commitMetricField("lastWeek")}
              disabled={disableEditing}
              type="number"
              step="any"
            />
          </div>
        </div>
        <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-2 rounded-full bg-blue-500 transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </Card>

      <Card className="space-y-5 rounded-[32px] p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Actions</h2>
          <span className="text-xs uppercase tracking-wide text-slate-400">{actionsDone} / {actionsTotal} done</span>
        </div>
        {ude.actions.length === 0 ? (
          <div className="rounded-[22px] bg-slate-100 px-4 py-6 text-sm text-slate-500">No actions yet.</div>
        ) : (
          <div className="space-y-3">
            {ude.actions.map((action) => {
              const draft = actionDrafts[action.id] ?? {
                text: action.text,
                ownerId: String(action.ownerId),
                dueDate: action.dueDate ?? "",
              };
              return (
                <div
                  key={action.id}
                  className="grid gap-3 rounded-[20px] border border-slate-200 bg-white p-4 shadow-[0_20px_40px_-36px_rgba(15,23,42,0.7)] md:grid-cols-[2fr_1fr_1fr_1fr]"
                >
                  <Input
                    value={draft.text}
                    onChange={(event) => handleActionDraftChange(action, "text", event.target.value)}
                    onBlur={() => commitActionDraft(action, "text")}
                    disabled={disableEditing}
                  />
                  <select
                    value={draft.ownerId}
                    onChange={(event) => handleActionDraftChange(action, "ownerId", event.target.value)}
                    onBlur={() => commitActionDraft(action, "ownerId")}
                    disabled={disableEditing}
                    className="w-full rounded-full border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-blue-400 focus:outline-none"
                  >
                    {teamMembers.map((member) => (
                      <option key={member.id} value={member.id}>
                        {member.name}
                      </option>
                    ))}
                  </select>
                  <Input
                    value={draft.dueDate}
                    onChange={(event) => handleActionDraftChange(action, "dueDate", event.target.value)}
                    onBlur={() => commitActionDraft(action, "dueDate")}
                    disabled={disableEditing}
                    placeholder="YYYY-MM-DD"
                    type="date"
                  />
                  <div className="flex flex-wrap items-center gap-2">
                    {ACTION_STATUS_OPTIONS.map((status) => (
                      <button
                        key={status.value}
                        type="button"
                        disabled={disableEditing}
                        onClick={() => updateActionStatus(action, status.value)}
                        className={buttonClasses(
                          action.status === status.value ? "primary" : "outline",
                          "sm",
                          "px-3 text-xs",
                        )}
                      >
                        {status.label}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {!disableEditing && (
          <div className="space-y-2">
            <div className="grid gap-3 rounded-[20px] border border-dashed border-slate-300 bg-slate-50 p-4 md:grid-cols-[2fr_1fr_1fr_auto]">
              <Input
                value={newAction.text}
                onChange={(event) => setNewAction((prev) => ({ ...prev, text: event.target.value }))}
                placeholder="What needs to happen?"
              />
              <select
                value={newAction.ownerId}
                onChange={(event) => setNewAction((prev) => ({ ...prev, ownerId: event.target.value }))}
                className="w-full rounded-full border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-blue-400 focus:outline-none"
              >
                <option value="">Select owner</option>
                {teamMembers.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.name}
                  </option>
                ))}
              </select>
              <Input
                value={newAction.dueDate}
                onChange={(event) => setNewAction((prev) => ({ ...prev, dueDate: event.target.value }))}
                placeholder="Due date"
                type="date"
              />
              <Button size="sm" variant="primary" onClick={handleAddAction}>
                + Add Action
              </Button>
            </div>
            {validationMessage && <p className="text-xs text-rose-600">{validationMessage}</p>}
          </div>
        )}
      </Card>

      <Card className="space-y-4 rounded-[32px] p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Activity</h2>
          <span className="text-xs uppercase tracking-wide text-slate-400">{orderedLog.length} entries</span>
        </div>
        {orderedLog.length === 0 ? (
          <div className="rounded-[22px] bg-slate-100 px-4 py-6 text-sm text-slate-500">No activity yet.</div>
        ) : (
          <ol className="relative ml-4 space-y-4">
            <div className="absolute left-0 top-1 h-full w-px bg-slate-200" />
            {orderedLog.map((log) => (
              <li key={log.id} className="relative ml-4 rounded-[20px] border border-slate-200 bg-white p-4 shadow-sm">
                <span className="absolute left-[-28px] top-4 flex h-8 w-8 items-center justify-center rounded-full bg-white text-lg">
                  {iconForLog(log.message)}
                </span>
                <p className="text-sm font-medium text-slate-700">{log.message}</p>
                <p className="text-xs uppercase tracking-wide text-slate-400">{formatDate(log.timestamp)}</p>
              </li>
            ))}
          </ol>
        )}
      </Card>

      {showDecisionFooter && !disableEditing && (
        <Card className="flex flex-col gap-4 rounded-[32px] p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-slate-900">Decision</h2>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={() => void handleDecision("keep-active")}>
                Keep Active
              </Button>
              <Button variant="primary" size="sm" disabled={!canVerify || savingStatus} onClick={() => void handleDecision("verify")}>
                Verify
              </Button>
            </div>
          </div>
          <textarea
            value={needsWorkReason}
            onChange={(event) => setNeedsWorkReason(event.target.value)}
            placeholder="Call out what needs work…"
            className="h-24 rounded-[20px] border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm focus:border-blue-400 focus:outline-none"
          />
          <Button variant="ghost" size="sm" onClick={() => void handleDecision("needs-work")}>
            Flag Needs Work
          </Button>
        </Card>
      )}
    </div>
  );
};

export default UDEDetailCard;
