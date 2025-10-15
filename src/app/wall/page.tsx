"use client";

import Link from "next/link";
import { CSSProperties, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  DndContext,
  DragOverlay,
  DragEndEvent,
  DragStartEvent,
  PointerSensor,
  useDroppable,
  useDraggable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import QuickAddUDE from "@/components/QuickAddUDE";
import BackToDashboardButton from "@/components/BackToDashboardButton";
import { buttonClasses } from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import {
  UDE_STATUSES,
  type UDE,
  type UDEStatus,
  getProgressToGoal,
  useUDEs,
} from "@/lib/udeClientStore";

const CATEGORY_OPTIONS = ["Sales", "Ops", "Finance", "People", "Revenue", "Support", "Product"] as const;

const STATUS_COLUMNS: Array<{ status: UDEStatus; title: string; actionLabel?: string; nextStatus?: UDEStatus }>
  = [
    { status: "Defined", title: "Defined", actionLabel: "Activate", nextStatus: "Active" },
    { status: "Active", title: "Active", actionLabel: "Verify", nextStatus: "Verified" },
    { status: "Verified", title: "Verified", actionLabel: "Close", nextStatus: "Closed" },
    { status: "Closed", title: "Closed" },
  ];

type ColumnConfig = (typeof STATUS_COLUMNS)[number];

type ColumnProps = ColumnConfig & {
  udes: UDE[];
  onNavigate: (id: string) => void;
  onForward: (id: string, status: UDEStatus) => void;
  showAddButton?: boolean;
  onAddClick?: () => void;
  isVisible?: boolean;
};

type CardProps = {
  ude: UDE;
  actionLabel?: string;
  nextStatus?: UDEStatus;
  onNavigate: (id: string) => void;
  onForward: (id: string, status: UDEStatus) => void;
};

const statusTone = (status: UDEStatus) => {
  switch (status) {
    case "Active":
      return "active" as const;
    case "Verified":
      return "verified" as const;
    case "Closed":
      return "closed" as const;
    default:
      return "default" as const;
  }
};

const ownerInitial = (owner: string) => owner.trim().charAt(0).toUpperCase() || "?";

const isOverdue = (dueDate: string) => {
  if (!dueDate) return false;
  const due = new Date(dueDate);
  if (Number.isNaN(due.getTime())) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  due.setHours(0, 0, 0, 0);
  return due < today;
};

const formatDueDate = (value?: string | null) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

const DueDatePill = ({ due }: { due: string | null }) => {
  if (!due) return null;
  const overdue = isOverdue(due);
  return (
    <span
      className={buttonClasses(
        overdue ? "danger" : "outline",
        "sm",
        "px-3 py-1 text-xs font-semibold capitalize" + (overdue ? "" : " text-slate-600")
      )}
    >
      {overdue ? "Overdue" : "Due"} {formatDueDate(due)}
    </span>
  );
};

const UDECard = ({ ude, onNavigate, onForward, actionLabel, nextStatus }: CardProps) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: ude.id });
  const progress = getProgressToGoal(ude);

  const style: CSSProperties = {
    transform: transform ? CSS.Translate.toString(transform) : undefined,
    opacity: isDragging ? 0.75 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={() => onNavigate(ude.id)}
      className="cursor-pointer transition-transform duration-150 hover:-translate-y-1"
      {...listeners}
      {...attributes}
    >
      <Card className="flex flex-col gap-4 rounded-[24px] border border-slate-100 bg-white/95 shadow-[0_24px_50px_-40px_rgba(15,23,42,0.8)]">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-900 text-sm font-semibold text-white">
              {ownerInitial(ude.owner)}
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900">{ude.title}</p>
              <p className="text-xs text-slate-500">Owner {ude.owner}</p>
            </div>
          </div>
          <Badge tone={statusTone(ude.status)}>{ude.status}</Badge>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
          <span className="rounded-full bg-slate-100 px-3 py-1">{ude.category}</span>
          <span className="rounded-full bg-slate-100 px-3 py-1">{currencyFormatter.format(ude.costImpact)}</span>
          <DueDatePill due={ude.dueDate} />
        </div>
        <div>
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>{ude.metricName}</span>
            <span>{progress}% to goal</span>
          </div>
          <div className="mt-2 h-2 rounded-full bg-slate-100">
            <div
              className="h-2 rounded-full bg-blue-500 transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
        {nextStatus && actionLabel && (
          <button
            type="button"
            className={buttonClasses("outline", "sm", "justify-center")}
            onClick={(event) => {
              event.stopPropagation();
              onForward(ude.id, nextStatus);
            }}
          >
            {actionLabel}
          </button>
        )}
      </Card>
    </div>
  );
};

const WallColumn = ({
  status,
  title,
  udes,
  actionLabel,
  nextStatus,
  onForward,
  onNavigate,
  onAddClick,
  showAddButton,
  isVisible = true,
}: ColumnProps) => {
  const { isOver, setNodeRef } = useDroppable({ id: status });

  return (
    <section
      ref={setNodeRef}
      className={`flex min-h-[28rem] flex-1 flex-col gap-4 rounded-[34px] border border-slate-200 bg-white/80 p-4 backdrop-blur ${
        isVisible ? "" : "opacity-40"
      } ${isOver ? "shadow-[0_20px_50px_-30px_rgba(37,99,235,0.4)]" : ""}`}
    >
      <div className="flex items-center justify-between">
        <span className="rounded-full bg-slate-100 px-4 py-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
          {title}
        </span>
        <span className="text-xs text-slate-400">{udes.length}</span>
      </div>

      {isVisible && udes.length === 0 ? (
        <div className="rounded-[22px] bg-slate-50 px-4 py-6 text-center text-xs text-slate-400">
          No UDEs in this lane yet.
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {udes.map((ude) => (
            <UDECard
              key={ude.id}
              ude={ude}
              actionLabel={actionLabel}
              nextStatus={nextStatus}
              onForward={onForward}
              onNavigate={onNavigate}
            />
          ))}
        </div>
      )}

      {showAddButton && (
        <button
          type="button"
          className={buttonClasses("outline", "sm", "mt-auto justify-center")}
          onClick={() => onAddClick?.()}
        >
          + Add UDE
        </button>
      )}
    </section>
  );
};

const WallPage = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const udes = useUDEs((state) => state.udes);
  const forwardStatus = useUDEs((state) => state.forwardStatus);

  const ownerParam = searchParams.get("owner");

  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [ownerFilter, setOwnerFilter] = useState(() => ownerParam ?? "ALL");
  const [searchTerm, setSearchTerm] = useState("");
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    }),
  );

  useEffect(() => {
    setOwnerFilter(ownerParam ?? "ALL");
  }, [ownerParam]);

  const owners = useMemo(() => {
    const unique = Array.from(new Set(udes.map((ude) => ude.owner))).filter(Boolean);
    return unique.sort((a, b) => a.localeCompare(b));
  }, [udes]);

  const statusParam = searchParams.get("status");
  const filterParam = searchParams.get("filter");

  const allowedStatuses = useMemo(() => {
    if (filterParam) {
      const mapping: Record<string, UDEStatus> = {
        defined: "Defined",
        active: "Active",
        verified: "Verified",
        closed: "Closed",
      };
      const requested = filterParam
        .split(/[,+]/)
        .map((token) => token.trim().toLowerCase())
        .map((token) => mapping[token])
        .filter((status): status is UDEStatus => Boolean(status));
      if (requested.length > 0) {
        return UDE_STATUSES.filter((status) => requested.includes(status));
      }
    }
    if (!statusParam) return UDE_STATUSES;
    const requested = statusParam
      .split(",")
      .map((status) => status.trim())
      .filter((status): status is UDEStatus => (UDE_STATUSES as readonly string[]).includes(status));
    if (requested.length === 0) return UDE_STATUSES;
    return UDE_STATUSES.filter((status) => requested.includes(status));
  }, [statusParam, filterParam]);

  const filteredUDEs = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();
    return udes.filter((ude) => {
      const matchesCategory = categoryFilter === "ALL" || ude.category === categoryFilter;
      const matchesOwner = ownerFilter === "ALL" || ude.owner === ownerFilter;
      const matchesSearch = search === "" || ude.title.toLowerCase().includes(search);
      const matchesStatus = allowedStatuses.includes(ude.status);
      return matchesCategory && matchesOwner && matchesSearch && matchesStatus;
    });
  }, [udes, categoryFilter, ownerFilter, searchTerm, allowedStatuses]);

  const columnData = useMemo(
    () =>
      STATUS_COLUMNS.map((column) => ({
        ...column,
        udes: filteredUDEs.filter((ude) => ude.status === column.status),
        isVisible: allowedStatuses.includes(column.status),
      })),
    [filteredUDEs, allowedStatuses],
  );

  const activeCard = useMemo(() => {
    if (!activeId) return null;
    return udes.find((ude) => ude.id === activeId) ?? null;
  }, [activeId, udes]);

  const showToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => setToastMessage(null), 2400);
  };

  const canVerify = (ude: UDE) => ude.goal > 0 && ude.current >= ude.goal;

  const handleForward = (id: string, status: UDEStatus) => {
    const target = udes.find((ude) => ude.id === id);
    if (!target) return;
    if (status === "Verified" && !canVerify(target)) {
      showToast("Metric not at goal.");
      return;
    }
    const actor = "Wall";
    forwardStatus(id, status, actor);
  };

  const handleNavigate = (id: string) => {
    router.push(`/wall/${id}`);
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    if (!over) return;
    const targetStatus = over.id as UDEStatus;
    const draggedId = active.id as string;
    const draggedUDE = udes.find((ude) => ude.id === draggedId);
    if (!draggedUDE) return;
    const currentIndex = UDE_STATUSES.indexOf(draggedUDE.status);
    const targetIndex = UDE_STATUSES.indexOf(targetStatus);
    if (targetIndex === currentIndex + 1) {
      handleForward(draggedId, targetStatus);
    }
  };

  const handleDragCancel = () => setActiveId(null);

  const activeProgress = activeCard ? getProgressToGoal(activeCard) : 0;

  return (
    <div className="min-h-screen bg-slate-50 p-6 lg:p-10">
      <header className="mb-10 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Wall</p>
          <h1 className="text-2xl font-semibold text-slate-900">Accountability Loop</h1>
        </div>
        <BackToDashboardButton />
      </header>

      <div className="mb-8 flex flex-wrap items-center gap-4 rounded-[34px] border border-slate-200 bg-white/80 p-4 shadow-sm">
        <div className="flex min-w-[12rem] flex-1 items-center gap-2">
          <label htmlFor="category" className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Category
          </label>
          <select
            id="category"
            value={categoryFilter}
            onChange={(event) => setCategoryFilter(event.target.value)}
            className="w-full rounded-full border border-slate-200 px-4 py-2 text-sm text-slate-600 focus:border-blue-400 focus:outline-none"
          >
            <option value="ALL">All</option>
            {CATEGORY_OPTIONS.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>
        <div className="flex min-w-[12rem] flex-1 items-center gap-2">
          <label htmlFor="owner" className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Owner
          </label>
          <select
            id="owner"
            value={ownerFilter}
            onChange={(event) => setOwnerFilter(event.target.value)}
            className="w-full rounded-full border border-slate-200 px-4 py-2 text-sm text-slate-600 focus:border-blue-400 focus:outline-none"
          >
            <option value="ALL">All</option>
            {owners.map((owner) => (
              <option key={owner} value={owner}>
                {owner}
              </option>
            ))}
          </select>
        </div>
        <div className="flex min-w-[16rem] flex-[1.2] items-center gap-2">
          <label htmlFor="search" className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Search
          </label>
          <input
            id="search"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Search titles"
            className="w-full rounded-full border border-slate-200 px-4 py-2 text-sm text-slate-600 focus:border-blue-400 focus:outline-none"
          />
        </div>
      </div>

      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd} onDragCancel={handleDragCancel}>
        <div className="flex flex-col gap-8 xl:flex-row">
          {columnData.map((column) => (
            <WallColumn
              key={column.status}
              status={column.status}
              title={column.title}
              udes={column.udes}
              actionLabel={column.actionLabel}
              nextStatus={column.nextStatus}
              onForward={handleForward}
              onNavigate={handleNavigate}
              showAddButton={column.status === "Defined" && column.isVisible}
              onAddClick={() => setIsQuickAddOpen(true)}
              isVisible={column.isVisible}
            />
          ))}
        </div>

        <DragOverlay>
          {activeCard ? (
            <Card className="w-full max-w-sm rounded-[28px] border border-slate-200 bg-white p-5 shadow-xl">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-slate-900">{activeCard.title}</p>
                  <p className="text-xs text-slate-500">Owner {activeCard.owner}</p>
                </div>
                <Badge tone={statusTone(activeCard.status)}>{activeCard.status}</Badge>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                <span className="rounded-full bg-slate-100 px-3 py-1">{currencyFormatter.format(activeCard.costImpact)}</span>
                <DueDatePill due={activeCard.dueDate} />
              </div>
              <div className="mt-4">
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>{activeCard.metricName}</span>
                  <span>{activeProgress}% to goal</span>
                </div>
                <div className="mt-2 h-2 rounded-full bg-slate-100">
                  <div className="h-2 rounded-full bg-blue-500" style={{ width: `${activeProgress}%` }} />
                </div>
              </div>
            </Card>
          ) : null}
        </DragOverlay>
      </DndContext>

      {toastMessage && (
        <div className="fixed bottom-8 left-1/2 z-50 -translate-x-1/2 rounded-full bg-slate-900/90 px-4 py-2 text-sm text-white shadow-lg">
          {toastMessage}
        </div>
      )}

      <QuickAddUDE open={isQuickAddOpen} onClose={() => setIsQuickAddOpen(false)} />
    </div>
  );
};

export default WallPage;

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});
