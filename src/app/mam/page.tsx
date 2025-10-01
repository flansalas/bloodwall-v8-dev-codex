"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { buttonClasses } from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import UDEDetailCard from "@/components/UDEDetailCard";
import { MamSummary, useUDEs, type UDE } from "@/lib/udeStore";
import { loadSeedData } from "@/lib/seed";

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);

const formatDate = (value?: string) => {
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

const ownerInitial = (owner: string) => owner.trim().charAt(0).toUpperCase() || "?";

const MamModePage = () => {
  const router = useRouter();
  const udes = useUDEs((state) => state.udes);
  const getDueThisWeek = useUDEs((state) => state.getDueThisWeek);
  const addLog = useUDEs((state) => state.addLog);
  const recordMamSummary = useUDEs((state) => state.recordMamSummary);

  useEffect(() => {
    loadSeedData();
  }, []);

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

  const handleDecision = (decision: "verify" | "keep-active" | "needs-work", status: UDE["status"]) => {
    if (!selectedUde) return;
    setDecisions((prev) => {
      const next = { ...prev, [selectedUde.id]: { id: selectedUde.id, decision, status } };
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
          <Link href="/" className={buttonClasses("outline", "sm")}>Dashboard</Link>
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
                <UDEDetailCard udeId={selectedUde.id} showDecisionFooter onDecision={handleDecision} lockTargets disableEditing={false} />
              ) : (
                <div className="rounded-[24px] bg-slate-100 px-6 py-12 text-center text-sm text-slate-500">
                  Select a UDE from the agenda to review.
                </div>
              )}
            </Card>
          </main>
        </div>
      )}
    </div>
  );
};

export default MamModePage;
