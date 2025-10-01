"use client";

import { useEffect, useMemo, useState } from "react";
import Card from "@/components/ui/Card";
import Button, { buttonClasses } from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import Input from "@/components/ui/Input";
import {
  useUDEs,
  type Action,
  type ActionStatus,
  type UDEStatus,
  getProgressToGoal,
} from "@/lib/udeStore";

const actionStatuses: ActionStatus[] = ["Not Started", "In Progress", "Done"];

const formatDate = (value?: string) => {
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
  metricName: string;
  baseline: string;
  goal: string;
  current: string;
  lastWeek: string;
};

type NewActionDraft = {
  text: string;
  owner: string;
  dueDate: string;
};

type Decision = "verify" | "keep-active" | "needs-work";

type UDEDetailCardProps = {
  udeId: string;
  disableEditing?: boolean;
  showDecisionFooter?: boolean;
  onDecision?: (decision: Decision, status: UDEStatus) => void;
  lockTargets?: boolean;
};

const initialActionDraft: NewActionDraft = { text: "", owner: "", dueDate: "" };

const iconForLog = (message: string) => {
  const lower = message.toLowerCase();
  if (lower.includes("metric")) return "📊";
  if (lower.includes("action")) return "✅";
  if (lower.includes("moved") || lower.includes("status")) return "🔄";
  return "📝";
};

const statusBadgeTone = (status: ActionStatus) => {
  switch (status) {
    case "In Progress":
      return "active" as const;
    case "Done":
      return "verified" as const;
    default:
      return "default" as const;
  }
};

const UDEDetailCard = ({ udeId, disableEditing = false, showDecisionFooter = false, onDecision, lockTargets = false }: UDEDetailCardProps) => {
  const ude = useUDEs((state) => state.udes.find((item) => item.id === udeId));
  const addMetricName = useUDEs((state) => state.addMetricName);
  const updateMetric = useUDEs((state) => state.updateMetric);
  const addAction = useUDEs((state) => state.addAction);
  const updateActionStatus = useUDEs((state) => state.updateActionStatus);
  const updateActionDetails = useUDEs((state) => state.updateActionDetails);
  const addLog = useUDEs((state) => state.addLog);
  const forwardStatus = useUDEs((state) => state.forwardStatus);

  const [metricDraft, setMetricDraft] = useState<MetricDraft | null>(null);
  const [actionDrafts, setActionDrafts] = useState<Record<string, NewActionDraft>>({});
  const [newAction, setNewAction] = useState<NewActionDraft>(initialActionDraft);
  const [needsWorkReason, setNeedsWorkReason] = useState("");
  const [validationMessage, setValidationMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!ude) return;
    setMetricDraft({
      metricName: ude.metricName,
      baseline: ude.baseline.toString(),
      goal: ude.goal.toString(),
      current: ude.current.toString(),
      lastWeek: ude.lastWeek.toString(),
    });
    const drafts: Record<string, NewActionDraft> = {};
    ude.actions.forEach((action) => {
      drafts[action.id] = {
        text: action.text,
        owner: action.owner,
        dueDate: action.dueDate,
      };
    });
    setActionDrafts(drafts);
    setNeedsWorkReason("");
    setValidationMessage(null);
  }, [ude]);

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

  const allowTargetEdits = !disableEditing && !lockTargets;

  const handleMetricDraftChange = (field: keyof MetricDraft, value: string) => {
    setMetricDraft((prev) => (prev ? { ...prev, [field]: value } : prev));
  };

  const commitMetricField = (field: keyof MetricDraft) => {
    if (disableEditing) return;
    const value = metricDraft[field];
    if (field === "metricName") {
      addMetricName(ude.id, value);
      return;
    }
    if (lockTargets && (field === "baseline" || field === "goal")) {
      return;
    }
    const numeric = Number(value);
    if (Number.isNaN(numeric)) return;
    const payload: Record<string, number> = { [field]: numeric };
    updateMetric(ude.id, payload);
  };

  const handleActionDraftChange = (action: Action, field: keyof NewActionDraft, value: string) => {
    setActionDrafts((prev) => ({
      ...prev,
      [action.id]: {
        ...(prev[action.id] ?? { text: action.text, owner: action.owner, dueDate: action.dueDate }),
        [field]: value,
      },
    }));
  };

  const commitActionDraft = (action: Action, field: keyof NewActionDraft) => {
    if (disableEditing) return;
    const draft = actionDrafts[action.id];
    if (!draft) return;
    const payload: Partial<Action> = { [field === "text" ? "text" : field === "owner" ? "owner" : "dueDate"]: draft[field] };
    updateActionDetails(ude.id, action.id, payload);
  };

  const handleAddAction = () => {
    if (disableEditing) return;
    const text = newAction.text.trim();
    if (!text) {
      setValidationMessage("Add a description before saving the action.");
      return;
    }
    addAction(ude.id, text, newAction.owner.trim(), newAction.dueDate.trim());
    setNewAction(initialActionDraft);
    setValidationMessage(null);
  };

  const progress = getProgressToGoal(ude);
  const canVerify = ude.goal > 0 && ude.current >= ude.goal;
  const canKeepActive = ude.status === "Active";
  const actionsTotal = ude.actions.length;
  const actionsDone = ude.actions.filter((action) => action.status === "Done").length;

  const handleDecision = (decision: Decision) => {
    if (disableEditing) return;
    if (decision === "verify") {
      if (!canVerify) {
        setValidationMessage("Metric must be at or above goal before verifying.");
        return;
      }
      forwardStatus(ude.id, "Verified", "Detail view");
      onDecision?.("verify", "Verified");
      return;
    }

    if (decision === "keep-active") {
      addLog(ude.id, `Reviewed and remains Active – ${ude.metricName} ${ude.current}`);
      onDecision?.("keep-active", ude.status);
      return;
    }

    const reason = needsWorkReason.trim();
    if (!reason) {
      setValidationMessage("Add a short note before flagging needs work.");
      return;
    }
    addLog(ude.id, `Needs Work: ${reason}`);
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
              <span className="rounded-full bg-slate-100 px-3 py-1">Owner {ude.owner}</span>
              <span className="rounded-full bg-slate-100 px-3 py-1">{ude.category}</span>
              <span className="rounded-full bg-slate-100 px-3 py-1">{currencyFormatter.format(ude.costImpact)} / yr</span>
              <span className="rounded-full bg-slate-100 px-3 py-1">Due {formatDate(ude.dueDate)}</span>
            </div>
          </div>
          <Badge tone={statusBadgeTone(ude.status === "Verified" ? "Done" : ude.status === "Active" ? "In Progress" : "Not Started" as ActionStatus)}>
            {ude.status}
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
              value={metricDraft.metricName}
              onChange={(event) => handleMetricDraftChange("metricName", event.target.value)}
              onBlur={() => commitMetricField("metricName")}
              disabled={disableEditing}
            />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Baseline</p>
            <Input
              value={metricDraft.baseline}
              onChange={(event) => handleMetricDraftChange("baseline", event.target.value)}
              onBlur={() => commitMetricField("baseline")}
              disabled={!allowTargetEdits}
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
              disabled={!allowTargetEdits}
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
                owner: action.owner,
                dueDate: action.dueDate,
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
                  <Input
                    value={draft.owner}
                    onChange={(event) => handleActionDraftChange(action, "owner", event.target.value)}
                    onBlur={() => commitActionDraft(action, "owner")}
                    disabled={disableEditing}
                    placeholder="Owner"
                  />
                  <Input
                    value={draft.dueDate}
                    onChange={(event) => handleActionDraftChange(action, "dueDate", event.target.value)}
                    onBlur={() => commitActionDraft(action, "dueDate")}
                    disabled={disableEditing}
                    placeholder="YYYY-MM-DD"
                  />
                  <div className="flex flex-wrap items-center gap-2">
                    {actionStatuses.map((status) => (
                      <button
                        key={status}
                        type="button"
                        disabled={disableEditing}
                        onClick={() => updateActionStatus(ude.id, action.id, status)}
                        className={buttonClasses(
                          action.status === status ? "primary" : "outline",
                          "sm",
                          "px-3 text-xs"
                        )}
                      >
                        {status}
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
              <Input
                value={newAction.owner}
                onChange={(event) => setNewAction((prev) => ({ ...prev, owner: event.target.value }))}
                placeholder="Owner"
              />
              <Input
                value={newAction.dueDate}
                onChange={(event) => setNewAction((prev) => ({ ...prev, dueDate: event.target.value }))}
                placeholder="Due date"
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
                <span className="absolute -left-6 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-lg">
                  {iconForLog(log.message)}
                </span>
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>{new Date(log.timestamp).toLocaleString()}</span>
                </div>
                <p className="mt-2 text-sm text-slate-700">{log.message}</p>
              </li>
            ))}
          </ol>
        )}
      </Card>

      {showDecisionFooter && (
        <div className="sticky bottom-2 rounded-[32px] bg-white p-6 shadow-[0_30px_60px_-40px_rgba(15,23,42,0.6)]">
          <div className="flex flex-wrap items-center gap-3">
            <Button size="sm" variant="success" onClick={() => handleDecision("verify")} disabled={disableEditing || !canVerify}>
              ✅ Verify
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => handleDecision("keep-active")}
              disabled={disableEditing || !canKeepActive}
            >
              🔄 Keep Active
            </Button>
            <div className="flex flex-1 items-center gap-2">
              <Input
                value={needsWorkReason}
                onChange={(event) => setNeedsWorkReason(event.target.value)}
                placeholder="Add note for Needs Work"
                disabled={disableEditing}
              />
              <Button variant="warning" size="sm" onClick={() => handleDecision("needs-work")} disabled={disableEditing}>
                ⚠️ Needs Work
              </Button>
            </div>
          </div>
          {validationMessage && <p className="mt-3 text-sm text-rose-600">{validationMessage}</p>}
        </div>
      )}
    </div>
  );
};

export default UDEDetailCard;

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});
