"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import BackToDashboardButton from "@/components/BackToDashboardButton";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import UDEDetailCard from "@/components/UDEDetailCard";
import { MamSummary, useUDEs, type UDE } from "@/lib/udeClientStore";
import type { UDEStatus as ApiUDEStatus } from "@/types/api";

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);

const formatDate = (value?: string | null) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
};

type DecisionOutcome = {
  id: string;
  decision: "verify" | "keep-active" | "needs-work";
  status: UDE["status"];
};

const statusFromApi: Record<ApiUDEStatus, UDE["status"]> = {
  DEFINED: "Defined",
  ACTIVE: "Active",
  VERIFIED: "Verified",
  CLOSED: "Closed",
};

const ownerInitial = (owner: string) => owner.trim().charAt(0).toUpperCase() || "?";

const MamModePage = () => {
  const router = useRouter();
  const udes = useUDEs((state) => state.udes);
  const getDueThisWeek = useUDEs((state) => state.getDueThisWeek);
  const addLog = useUDEs((state) => state.addLog);
  const recordMamSummary = useUDEs((state) => state.recordMamSummary);

  const agenda = useMemo(() => {
    const due = getDueThisWeek();
    if (due.length > 0) return due;
    return udes
      .filter((ude) => ude.status === "Active")
      .sort((a, b) => (a.dueDate ?? "").localeCompare(b.dueDate ?? ""));
  }, [getDueThisWeek, udes]);

  const [selectedId, setSelectedId] = useState<string | null>(agenda[0]?.id ?? null);
  const [decisions, setDecisions] = useState<Record<string, DecisionOutcome>>({});
  const [summarySent, setSummarySent] = useState(false);

  useEffect(() => {
    if (agenda.length === 0) {
      setSelectedId(null);
      return;
    }
    if (selectedId && agenda.some((ude) => ude.id === selectedId)) return;
    const next = agenda.find((ude) => !decisions[ude.id]) ?? agenda[0];
    setSelectedId(next?.id ?? null);
  }, [agenda, decisions, selectedId]);

  const totalAgenda = agenda.length;
  const reviewedCount = Object.keys(decisions).length;
  const progressLabel = totalAgenda ? `${Math.min(reviewedCount, totalAgenda)} of ${totalAgenda} reviewed` : "No agenda";

  const selectedUde = useMemo(() => agenda.find((ude) => ude.id === selectedId) ?? null, [agenda, selectedId]);

  const actionsDueThisWeek = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const startOfWeek = new Date(today);
    const day = startOfWeek.getDay(); // 0 (Sun) - 6 (Sat)
    const diffToMonday = day === 0 ? -6 : 1 - day;
    startOfWeek.setDate(startOfWeek.getDate() + diffToMonday);

    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(endOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);

    const msPerDay = 24 * 60 * 60 * 1000;

    return udes
      .flatMap((ude) =>
        ude.actions.map((action) => ({
          ude,
          action,
        })),
      )
      .filter(({ action }) => action.status.toLowerCase() !== "done")
      .filter(({ action }) => {
        if (!action.dueDate) return false;
        const due = new Date(action.dueDate);
        if (Number.isNaN(due.getTime())) return false;
        return due >= startOfWeek && due <= endOfWeek;
      })
      .map(({ ude, action }) => {
        const due = new Date(action.dueDate ?? "");
        due.setHours(0, 0, 0, 0);
        const dueInDays = Math.round((due.getTime() - today.getTime()) / msPerDay);
        return {
          id: action.id,
          text: action.text,
          owner: action.owner,
          udeTitle: ude.title,
          dueDate: action.dueDate ?? "",
          dueInDays,
          overdue: due.getTime() < today.getTime(),
        };
      })
      .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
  }, [udes]);

  const handleDecision = (decision: "verify" | "keep-active" | "needs-work", status: ApiUDEStatus) => {
    if (!selectedUde) return;
    setDecisions((prev) => {
      const next = {
        ...prev,
        [selectedUde.id]: {
          id: selectedUde.id,
          decision,
          status: statusFromApi[status],
        },
      };
      const remaining = agenda.find((ude) => !next[ude.id]);
      setSelectedId(remaining?.id ?? null);
      return next;
    });
  };

  const showSummary = totalAgenda > 0 && reviewedCount >= totalAgenda;

  const costEliminated = udes.filter((ude) => ude.status === "Verified").reduce((acc, ude) => acc + ude.costImpact, 0);
  const costAtRisk = udes.filter((ude) => ude.status === "Defined" || ude.status === "Active").reduce((acc, ude) => acc + ude.costImpact, 0);

  useEffect(() => {
    if (!showSummary || summarySent) return;
    const reviewedOwners: Record<string, number> = {};
    Object.values(decisions).forEach((outcome) => {
      const match = udes.find((ude) => ude.id === outcome.id);
      if (!match) return;
      reviewedOwners[match.owner] = (reviewedOwners[match.owner] ?? 0) + 1;
      if (outcome.decision === "keep-active") {
        addLog(outcome.id, "Reviewed during MAM – remains active");
      }
    });

    const summary: MamSummary = {
      timestamp: new Date().toISOString(),
      agendaTotal: totalAgenda,
      reviewed: reviewedCount,
      verified: Object.values(decisions).filter((item) => item.decision === "verify").length,
      keptActive: Object.values(decisions).filter((item) => item.decision === "keep-active").length,
      needsWork: Object.values(decisions).filter((item) => item.decision === "needs-work").length,
      newLogged: udes.filter((ude) => ude.status === "Defined").length,
      costEliminated,
      costAtRisk,
      reviewedOwners,
      actionsCompleted: udes.reduce(
        (total, ude) => total + ude.actions.filter((action) => action.status === "Done").length,
        0,
      ),
      actionsOutstanding: udes.reduce(
        (total, ude) => total + ude.actions.filter((action) => action.status !== "Done").length,
        0,
      ),
    };

    recordMamSummary(summary);
    setSummarySent(true);
    router.push("/mam/summary");
  }, [
    showSummary,
    summarySent,
    decisions,
    totalAgenda,
    reviewedCount,
    costEliminated,
    costAtRisk,
    router,
    recordMamSummary,
    udes,
    addLog,
  ]);

  return (
    <div className="min-h-screen bg-slate-50 px-6 py-10 text-slate-900">
      <Card className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-slate-400">MAM Mode</p>
          <h1 className="text-2xl font-semibold text-slate-900">Weekly Accountability Review</h1>
        </div>
        <div className="flex items-center gap-3">
          <Badge tone="active" className="text-sm font-semibold">
            {progressLabel}
          </Badge>
          <BackToDashboardButton />
        </div>
      </Card>

      {showSummary ? (
        <Card className="space-y-6 rounded-[32px] p-8 text-center text-slate-600">
          <p className="text-sm">Summary ready. Redirecting…</p>
        </Card>
      ) : (
        <div className="flex flex-col gap-6 lg:flex-row">
          <aside className="lg:w-80">
            <Card className="rounded-[32px] p-5">
              <h2 className="mb-4 text-xs font-semibold uppercase tracking-wide text-slate-500">Agenda</h2>
              {agenda.length === 0 ? (
                <div className="rounded-[22px] bg-slate-100 px-4 py-6 text-sm text-slate-500">No active UDEs to review.</div>
              ) : (
                <ul className="space-y-3">
                  {agenda.map((ude) => {
                    const isActive = selectedId === ude.id;
                    const decision = decisions[ude.id];
                    return (
                      <li key={ude.id}>
                        <button
                          type="button"
                          onClick={() => setSelectedId(ude.id)}
                          className={`flex w-full items-center justify-between rounded-full px-4 py-3 text-left text-sm transition ${
                            isActive ? "bg-slate-900 text-white shadow-lg" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`flex h-8 w-8 items-center justify-center rounded-full ${
                              isActive ? "bg-white/20" : "bg-white"
                            } text-xs font-semibold ${isActive ? "text-white" : "text-slate-600"}`}>
                              {ownerInitial(ude.owner)}
                            </div>
                            <div className="space-y-1">
                              <p className="font-medium">{ude.title}</p>
                              <p className="text-[11px] uppercase tracking-wide opacity-70">{ude.metricName}</p>
                            </div>
                          </div>
                          <div className="text-right text-xs opacity-70">
                            <div>{formatCurrency(ude.costImpact)}</div>
                            <div>Due {formatDate(ude.dueDate)}</div>
                          </div>
                        </button>
                        {decision && (
                          <p className="mt-1 text-xs text-slate-500">
                            {decision.decision === "verify"
                              ? "Verified"
                              : decision.decision === "keep-active"
                                ? "Kept Active"
                                : "Needs Work"}
                          </p>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </Card>
          </aside>

          <main className="flex-1">
            <Card className="rounded-[32px] p-6">
              {selectedUde ? (
                <UDEDetailCard
                  udeId={Number(selectedUde.id)}
                  showDecisionFooter
                  onDecision={handleDecision}
                  lockTargets
                  disableEditing={false}
                />
              ) : (
                <div className="rounded-[24px] bg-slate-100 px-6 py-12 text-center text-sm text-slate-500">
                  Select a UDE from the agenda to review.
                </div>
              )}
            </Card>
            <Card className="mt-6 rounded-[32px] p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">Actions due this week</h2>
                  <p className="text-sm text-slate-500">Focus on actions scheduled before Sunday.</p>
                </div>
                <Badge tone="default" className="text-xs font-semibold uppercase tracking-wide">
                  {actionsDueThisWeek.length} open
                </Badge>
              </div>
              {actionsDueThisWeek.length === 0 ? (
                <p className="mt-6 text-sm text-slate-500">No actions due this week.</p>
              ) : (
                <ul className="mt-6 space-y-3">
                  {actionsDueThisWeek.map((item) => (
                    <li
                      key={item.id}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 px-4 py-3"
                    >
                      <div className="space-y-1">
                        <p className="font-medium text-slate-900">{item.text}</p>
                        <p className="text-xs uppercase tracking-wide text-slate-500">
                          {item.udeTitle} · {item.owner}
                        </p>
                      </div>
                      <div className="flex items-center gap-3 text-right text-xs text-slate-500">
                        {item.overdue && <Badge tone="danger">Overdue</Badge>}
                        <div className="space-y-1">
                          <p>Due {formatDate(item.dueDate)}</p>
                          <p className="font-semibold text-slate-700">Due in {item.dueInDays} days</p>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </main>
        </div>
      )}
    </div>
  );
};

export default MamModePage;
