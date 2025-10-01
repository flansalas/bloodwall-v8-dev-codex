"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Input from "@/components/ui/Input";
import Button, { buttonClasses } from "@/components/ui/Button";
import { ACTION_STATUSES, getProgressToGoal, useUDEs, type Action, type UDE } from "@/lib/udeStore";

const today = () => {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
};

const addDays = (value: Date, amount: number) => {
  const next = new Date(value);
  next.setDate(next.getDate() + amount);
  return next;
};

const MePage = () => {
  const company = useUDEs((state) => state.company);
  const udes = useUDEs((state) => state.udes);
  const updateMetric = useUDEs((state) => state.updateMetric);
  const updateActionStatus = useUDEs((state) => state.updateActionStatus);
  const addLog = useUDEs((state) => state.addLog);

  const defaultOwner = company.team[0] ?? udes[0]?.owner ?? "";
  const [owner, setOwner] = useState(defaultOwner);

  const ownerUdes = useMemo(() => udes.filter((ude) => (owner ? ude.owner === owner : true)), [udes, owner]);
  const cardData = useMemo(() => ownerUdes.map((ude) => ({ ude, state: getOwnerCardState(ude) })), [ownerUdes]);
  const updatedCount = cardData.filter((item) => item.state === "updated").length;
  const soonCount = cardData.filter((item) => item.state === "soon").length;
  const needsCount = cardData.length - updatedCount;

  const markAllDisabled = cardData.length === 0 || updatedCount !== cardData.length;

  const handleMarkAllUpdated = () => {
    cardData.forEach(({ ude }) => {
      addLog(ude.id, `Owner ${owner} marked UDE as updated.`);
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 px-6 py-10 text-slate-900">
      <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-slate-400">My Updates</p>
          <h1 className="text-3xl font-semibold tracking-tight">My Accountability</h1>
          <p className="text-sm text-slate-500">Update your UDEs before the meeting</p>
        </div>
        <Badge tone={updatedCount === cardData.length ? "verified" : "active"}>
          {updatedCount} of {cardData.length} updated
        </Badge>
      </header>

      {company.team.length > 1 && (
        <div className="mb-6 flex flex-wrap gap-2">
          {company.team.map((member) => (
            <button
              key={member}
              type="button"
              onClick={() => setOwner(member)}
              className={buttonClasses(owner === member ? "primary" : "outline", "sm", "px-4")}
            >
              {member}
            </button>
          ))}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <SummaryPill label="Needs Update" value={needsCount} tone="danger" />
        <SummaryPill label="Due Soon" value={soonCount} tone="active" />
        <SummaryPill label="Updated" value={updatedCount} tone="verified" />
      </div>

      <div className="mt-8 space-y-5">
        {cardData.length === 0 ? (
          <Card className="rounded-[32px] bg-white/70 p-8 text-center text-sm text-slate-500">
            No UDEs assigned. Add one from the dashboard.
          </Card>
        ) : (
          cardData
            .sort((a, b) => cardStateOrder(a.state) - cardStateOrder(b.state))
            .map(({ ude, state }) => (
              <OwnerCard
                key={ude.id}
                ude={ude}
                state={state}
                onUpdate={(payload) => {
                  if (payload.metric !== undefined) {
                    updateMetric(ude.id, payload.metric);
                  }
                  if (payload.action) {
                    updateActionStatus(ude.id, payload.action.actionId, payload.action.status);
                  }
                  if (payload.note) {
                    addLog(ude.id, `Owner ${owner}: ${payload.note}`);
                  }
                }}
              />
            ))
        )}
      </div>

      <footer className="mt-10 flex flex-wrap items-center justify-between gap-4">
        <Button variant="primary" size="sm" disabled={markAllDisabled} onClick={handleMarkAllUpdated}>
          Mark all updated
        </Button>
        <Link href={`/wall?owner=${encodeURIComponent(owner)}`} className={buttonClasses("outline", "sm")}>Open UDE Wall (filtered to me)</Link>
      </footer>
    </div>
  );
};

export default MePage;

const SummaryPill = ({ label, value, tone }: { label: string; value: number; tone: "danger" | "active" | "verified" }) => {
  const toneClasses: Record<typeof tone, string> = {
    danger: "bg-rose-50 text-rose-700",
    active: "bg-blue-50 text-blue-700",
    verified: "bg-emerald-50 text-emerald-700",
  };
  return (
    <Card className={`rounded-[28px] text-center ${toneClasses[tone]}`}>
      <p className="text-3xl font-semibold">{value}</p>
      <p className="text-xs uppercase tracking-wide opacity-80">{label}</p>
    </Card>
  );
};

const OwnerCard = ({
  ude,
  state,
  onUpdate,
}: {
  ude: UDE;
  state: OwnerCardState;
  onUpdate: (payload: OwnerUpdatePayload) => void;
}) => {
  const [currentValue, setCurrentValue] = useState(ude.current.toString());
  const [note, setNote] = useState("");
  const [selectedActionId, setSelectedActionId] = useState<string>("none");
  const [selectedStatus, setSelectedStatus] = useState(ACTION_STATUSES[0]);

  const progress = getProgressToGoal(ude);

  const handleSave = () => {
    const updates: OwnerUpdatePayload = {};
    const numeric = Number.parseFloat(currentValue);
    if (!Number.isNaN(numeric)) {
      updates.metric = { current: numeric };
    }
    if (selectedActionId !== "none") {
      updates.action = { actionId: selectedActionId, status: selectedStatus };
    }
    if (note.trim()) {
      updates.note = note.trim();
    }
    if (updates.metric || updates.action || updates.note) {
      onUpdate(updates);
      if (updates.action) {
        setSelectedActionId("none");
        setSelectedStatus(ACTION_STATUSES[0]);
      }
      if (updates.note) {
        setNote("");
      }
    }
  };

  return (
    <Card className="rounded-[36px] p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">{ude.title}</h2>
          <p className="text-xs text-slate-500">Metric · {ude.metricName}</p>
        </div>
        <Badge tone={getBadgeTone(state)}>{labelForState(state)}</Badge>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-slate-500">
        <span className="rounded-full bg-slate-100 px-3 py-1">Cost {currency(ude.costImpact)}</span>
        <span className="rounded-full bg-slate-100 px-3 py-1">Current {ude.current}</span>
        <span className="rounded-full bg-slate-100 px-3 py-1">Goal {ude.goal}</span>
        <span className="rounded-full bg-slate-100 px-3 py-1">Due {formatDate(ude.dueDate)}</span>
      </div>

      <div className="mt-4">
        <div className="flex items-center justify-between text-xs text-slate-500">
          <span>Progress</span>
          <span>{progress}% to goal</span>
        </div>
        <div className="mt-2 h-2 rounded-full bg-slate-200">
          <div className="h-2 rounded-full bg-blue-500" style={{ width: `${progress}%` }} />
        </div>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <label className="space-y-2 text-sm font-medium text-slate-600">
          <span>Current value</span>
          <Input value={currentValue} onChange={(event) => setCurrentValue(event.target.value)} type="number" step="any" />
        </label>
        <label className="space-y-2 text-sm font-medium text-slate-600">
          <span>Weekly note</span>
          <Input value={note} onChange={(event) => setNote(event.target.value)} placeholder="What moved this week?" />
        </label>
      </div>

      <div className="mt-6 grid gap-3 md:grid-cols-2">
        <label className="space-y-2 text-sm font-medium text-slate-600">
          <span>Select action</span>
          <select
            value={selectedActionId}
            onChange={(event) => {
              const id = event.target.value;
              setSelectedActionId(id);
              const action = ude.actions.find((item) => item.id === id);
              if (action) {
                setSelectedStatus(action.status);
              }
            }}
            className="w-full rounded-full border border-slate-200 bg-white/80 px-4 py-2 text-sm text-slate-700 shadow-sm focus:border-blue-400 focus:outline-none"
          >
            <option value="none">No action change</option>
            {ude.actions.map((action) => (
              <option key={action.id} value={action.id}>
                {action.text}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-2 text-sm font-medium text-slate-600">
          <span>Status</span>
          <select
            value={selectedStatus}
            onChange={(event) => setSelectedStatus(event.target.value as Action["status"])}
            className="w-full rounded-full border border-slate-200 bg-white/80 px-4 py-2 text-sm text-slate-700 shadow-sm focus:border-blue-400 focus:outline-none"
          >
            {ACTION_STATUSES.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="mt-6 flex justify-end">
        <Button size="sm" onClick={handleSave}>
          Save update
        </Button>
      </div>
    </Card>
  );
};

type OwnerCardState = "needs" | "soon" | "updated";

type OwnerUpdatePayload = {
  metric?: { current: number };
  action?: { actionId: string; status: Action["status"] };
  note?: string;
};

const getOwnerCardState = (ude: UDE): OwnerCardState => {
  if (ude.status === "Verified" || ude.status === "Closed" || (ude.goal > 0 && ude.current >= ude.goal)) {
    return "updated";
  }

  const dueDate = ude.dueDate ? new Date(ude.dueDate) : null;
  const todayDate = today();
  if (dueDate && dueDate <= todayDate) {
    return "needs";
  }
  if (dueDate && dueDate <= addDays(todayDate, 5)) {
    return "soon";
  }
  return "needs";
};

const cardStateOrder = (state: OwnerCardState) => {
  switch (state) {
    case "needs":
      return 0;
    case "soon":
      return 1;
    default:
      return 2;
  }
};

const labelForState = (state: OwnerCardState) => {
  switch (state) {
    case "needs":
      return "Needs Update";
    case "soon":
      return "Soon Due";
    default:
      return "Updated";
  }
};

const getBadgeTone = (state: OwnerCardState) => {
  switch (state) {
    case "needs":
      return "danger" as const;
    case "soon":
      return "active" as const;
    default:
      return "verified" as const;
  }
};

const currency = (value: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);

const formatDate = (value?: string) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
};
