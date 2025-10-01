import { useUDEs, type Action, type UDE } from "@/lib/udeStore";

type Owner = "Alice" | "Bob" | "Carol";

type SeedOverrides = Partial<UDE> & {
  title: string;
  owner: Owner;
  category: string;
  status: UDE["status"];
  costImpact: number;
};

const isoDaysAgo = (days: number) => {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString().slice(0, 10);
};

const isoDaysAhead = (days: number) => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
};

const action = (
  overrides: Partial<Action> & Pick<Action, "text" | "status"> & { owner?: Owner; dueDate?: string },
): Action => ({
  id: crypto.randomUUID(),
  text: overrides.text,
  owner: overrides.owner ?? "",
  dueDate: overrides.dueDate ?? "",
  status: overrides.status,
});

const buildUDE = (overrides: SeedOverrides): UDE => ({
  id: overrides.id ?? crypto.randomUUID(),
  title: overrides.title,
  owner: overrides.owner,
  category: overrides.category,
  costImpact: overrides.costImpact,
  dueDate: overrides.dueDate ?? isoDaysAhead(7),
  metricName: overrides.metricName ?? "Metric",
  baseline: overrides.baseline ?? 0,
  goal: overrides.goal ?? 0,
  current: overrides.current ?? 0,
  lastWeek: overrides.lastWeek ?? overrides.current ?? 0,
  status: overrides.status,
  actions: overrides.actions ?? [],
  activityLog: overrides.activityLog ?? [
    {
      id: crypto.randomUUID(),
      message: "Seeded record",
      timestamp: new Date().toISOString(),
    },
  ],
});

const SEED_DATA: UDE[] = [
  buildUDE({
    id: "ude-defined-1",
    title: "Reduce onboarding churn",
    owner: "Alice",
    category: "People",
    status: "Defined",
    costImpact: 54000,
    dueDate: isoDaysAhead(21),
    metricName: "Onboarding Churn %",
    baseline: 12,
    goal: 6,
    current: 12,
    lastWeek: 12,
    actions: [action({ text: "Interview churned customers", status: "Not Started" })],
  }),
  buildUDE({
    id: "ude-active-1",
    title: "Shorten deal cycle",
    owner: "Alice",
    category: "Sales",
    status: "Active",
    costImpact: 125000,
    dueDate: isoDaysAhead(5),
    metricName: "Deal Cycle Days",
    baseline: 90,
    goal: 60,
    current: 72,
    lastWeek: 78,
    actions: [
      action({ text: "Launch MEDDIC training", owner: "Enablement", status: "In Progress", dueDate: isoDaysAhead(3) }),
      action({ text: "Automate proposals", owner: "Ops", status: "Not Started", dueDate: isoDaysAhead(14) }),
    ],
  }),
  buildUDE({
    id: "ude-active-2",
    title: "Improve fulfillment accuracy",
    owner: "Bob",
    category: "Ops",
    status: "Active",
    costImpact: 86000,
    dueDate: isoDaysAhead(4),
    metricName: "Fulfillment Errors",
    baseline: 6,
    goal: 1,
    current: 2.5,
    lastWeek: 3.1,
    actions: [
      action({ text: "Deploy barcode scanners", owner: "Ops", status: "In Progress", dueDate: isoDaysAhead(2) }),
      action({ text: "Add double-check at packing", owner: "QA", status: "Done", dueDate: isoDaysAgo(3) }),
    ],
  }),
  buildUDE({
    id: "ude-verified-1",
    title: "Consolidate SaaS contracts",
    owner: "Carol",
    category: "Finance",
    status: "Verified",
    costImpact: 47000,
    dueDate: isoDaysAgo(2),
    metricName: "SaaS Spend ($K)",
    baseline: 120,
    goal: 60,
    current: 55,
    lastWeek: 60,
    actions: [action({ text: "Negotiate renewal", owner: "FinOps", status: "Done", dueDate: isoDaysAgo(7) })],
  }),
  buildUDE({
    id: "ude-closed-1",
    title: "Automate payroll adjustments",
    owner: "Bob",
    category: "People",
    status: "Closed",
    costImpact: 32000,
    dueDate: isoDaysAgo(30),
    metricName: "Payroll Adjustment Hours",
    baseline: 14,
    goal: 2,
    current: 1,
    lastWeek: 1,
    actions: [action({ text: "Integrate HRIS", owner: "People Ops", status: "Done", dueDate: isoDaysAgo(20) })],
  }),
];

export const loadSeedData = () => {
  if (process.env.NODE_ENV !== "development") {
    return;
  }
  const state = useUDEs.getState();
  if (state.udes.length > 0) {
    return;
  }
  useUDEs.setState({ udes: SEED_DATA });
};

const DEMO_DATA: UDE[] = [
  buildUDE({
    title: "Reduce onboarding churn",
    owner: "Alice",
    category: "People",
    status: "Active",
    costImpact: 54000,
    dueDate: isoDaysAhead(14),
    metricName: "Onboarding Churn %",
    baseline: 12,
    goal: 6,
    current: 7.8,
    lastWeek: 8.4,
    actions: [
      action({ text: "Run week-two listening sessions", owner: "CS", status: "In Progress", dueDate: isoDaysAhead(5) }),
      action({ text: "Ship milestone emails", owner: "Growth", status: "Not Started", dueDate: isoDaysAhead(9) }),
    ],
    activityLog: [
      { id: crypto.randomUUID(), message: "Created UDE Reduce onboarding churn with metric Onboarding Churn %.", timestamp: isoDaysAgo(21) },
      { id: crypto.randomUUID(), message: "Metric renamed to Onboarding Churn %.", timestamp: isoDaysAgo(20) },
      { id: crypto.randomUUID(), message: "Current updated to 8.4; Last week updated to 9.1", timestamp: isoDaysAgo(7) },
      { id: crypto.randomUUID(), message: "Action added: Run week-two listening sessions.", timestamp: isoDaysAgo(3) },
    ],
  }),
  buildUDE({
    title: "Shorten enterprise deal cycle",
    owner: "Alice",
    category: "Sales",
    status: "Active",
    costImpact: 125000,
    dueDate: isoDaysAhead(6),
    metricName: "Deal Cycle Days",
    baseline: 90,
    goal: 60,
    current: 68,
    lastWeek: 72,
    actions: [
      action({ text: "Enable MEDDIC discovery", owner: "Enablement", status: "Done", dueDate: isoDaysAgo(2) }),
      action({ text: "Automate proposal approvals", owner: "Ops", status: "In Progress", dueDate: isoDaysAhead(12) }),
    ],
    activityLog: [
      { id: crypto.randomUUID(), message: "Created UDE Shorten enterprise deal cycle with metric Deal Cycle Days.", timestamp: isoDaysAgo(30) },
      { id: crypto.randomUUID(), message: "Current updated to 72; Last week updated to 78", timestamp: isoDaysAgo(14) },
      { id: crypto.randomUUID(), message: "Action added: Enable MEDDIC discovery.", timestamp: isoDaysAgo(10) },
      { id: crypto.randomUUID(), message: "Action 'Enable MEDDIC discovery' → Done.", timestamp: isoDaysAgo(2) },
    ],
  }),
  buildUDE({
    title: "Lower fulfillment errors",
    owner: "Bob",
    category: "Ops",
    status: "Active",
    costImpact: 86000,
    dueDate: isoDaysAhead(10),
    metricName: "Fulfillment Error Rate",
    baseline: 5.8,
    goal: 2,
    current: 3.2,
    lastWeek: 3.6,
    actions: [
      action({ text: "Deploy barcode validation", owner: "Ops", status: "In Progress", dueDate: isoDaysAhead(4) }),
      action({ text: "Audit packing SOP", owner: "QA", status: "Not Started", dueDate: isoDaysAhead(8) }),
    ],
    activityLog: [
      { id: crypto.randomUUID(), message: "Created UDE Lower fulfillment errors with metric Fulfillment Error Rate.", timestamp: isoDaysAgo(40) },
      { id: crypto.randomUUID(), message: "Current updated to 3.6; Last week updated to 4.1", timestamp: isoDaysAgo(7) },
      { id: crypto.randomUUID(), message: "Action added: Deploy barcode validation.", timestamp: isoDaysAgo(5) },
      { id: crypto.randomUUID(), message: "Action added: Audit packing SOP.", timestamp: isoDaysAgo(3) },
    ],
  }),
  buildUDE({
    title: "Reduce cloud waste",
    owner: "Carol",
    category: "Finance",
    status: "Verified",
    costImpact: 47000,
    dueDate: isoDaysAgo(1),
    metricName: "Monthly Cloud Spend",
    baseline: 220,
    goal: 180,
    current: 175,
    lastWeek: 182,
    actions: [
      action({ text: "Archive unused snapshots", owner: "Infra", status: "Done", dueDate: isoDaysAgo(9) }),
      action({ text: "Negotiate reserved instances", owner: "FinOps", status: "Done", dueDate: isoDaysAgo(4) }),
    ],
    activityLog: [
      { id: crypto.randomUUID(), message: "Created UDE Reduce cloud waste with metric Monthly Cloud Spend.", timestamp: isoDaysAgo(45) },
      { id: crypto.randomUUID(), message: "Action added: Archive unused snapshots.", timestamp: isoDaysAgo(30) },
      { id: crypto.randomUUID(), message: "Action 'Archive unused snapshots' → Done.", timestamp: isoDaysAgo(10) },
      { id: crypto.randomUUID(), message: "UDE moved to Verified by Demo seed.", timestamp: isoDaysAgo(2) },
    ],
  }),
  buildUDE({
    title: "Improve inbound SLA",
    owner: "Alice",
    category: "Support",
    status: "Defined",
    costImpact: 36000,
    dueDate: isoDaysAhead(18),
    metricName: "First Reply Minutes",
    baseline: 24,
    goal: 12,
    current: 21,
    lastWeek: 22,
    actions: [
      action({ text: "Staff follow-the-sun rotation", owner: "Support", status: "Not Started", dueDate: isoDaysAhead(6) }),
    ],
    activityLog: [
      { id: crypto.randomUUID(), message: "Created UDE Improve inbound SLA with metric First Reply Minutes.", timestamp: isoDaysAgo(5) },
      { id: crypto.randomUUID(), message: "Action added: Staff follow-the-sun rotation.", timestamp: isoDaysAgo(3) },
    ],
  }),
  buildUDE({
    title: "Reduce QA escape rate",
    owner: "Bob",
    category: "Ops",
    status: "Active",
    costImpact: 78000,
    dueDate: isoDaysAhead(3),
    metricName: "Escapes per 1k Units",
    baseline: 12,
    goal: 4,
    current: 5.5,
    lastWeek: 6.2,
    actions: [
      action({ text: "Add inline QC camera", owner: "Engineering", status: "In Progress", dueDate: isoDaysAhead(2) }),
      action({ text: "Retrain line leads", owner: "People Ops", status: "Done", dueDate: isoDaysAgo(1) }),
    ],
    activityLog: [
      { id: crypto.randomUUID(), message: "Created UDE Reduce QA escape rate with metric Escapes per 1k Units.", timestamp: isoDaysAgo(18) },
      { id: crypto.randomUUID(), message: "Action added: Add inline QC camera.", timestamp: isoDaysAgo(15) },
      { id: crypto.randomUUID(), message: "Action 'Retrain line leads' → Done.", timestamp: isoDaysAgo(2) },
    ],
  }),
  buildUDE({
    title: "Grow NRR to 120%",
    owner: "Carol",
    category: "Revenue",
    status: "Active",
    costImpact: 150000,
    dueDate: isoDaysAhead(25),
    metricName: "Net Revenue Retention %",
    baseline: 104,
    goal: 120,
    current: 112,
    lastWeek: 110,
    actions: [
      action({ text: "Launch VIP success program", owner: "Success", status: "In Progress", dueDate: isoDaysAhead(7) }),
      action({ text: "Expand usage dashboards", owner: "Product", status: "Not Started", dueDate: isoDaysAhead(15) }),
    ],
    activityLog: [
      { id: crypto.randomUUID(), message: "Created UDE Grow NRR to 120% with metric Net Revenue Retention %.", timestamp: isoDaysAgo(25) },
      { id: crypto.randomUUID(), message: "Current updated to 112; Last week updated to 110", timestamp: isoDaysAgo(1) },
    ],
  }),
  buildUDE({
    title: "Shorten hiring cycle",
    owner: "Alice",
    category: "People",
    status: "Defined",
    costImpact: 42000,
    dueDate: isoDaysAhead(28),
    metricName: "Days to Fill",
    baseline: 48,
    goal: 30,
    current: 45,
    lastWeek: 47,
    actions: [
      action({ text: "Outsource top-of-funnel", owner: "Recruiting", status: "Not Started", dueDate: isoDaysAhead(10) }),
    ],
    activityLog: [
      { id: crypto.randomUUID(), message: "Created UDE Shorten hiring cycle with metric Days to Fill.", timestamp: isoDaysAgo(4) },
      { id: crypto.randomUUID(), message: "Action added: Outsource top-of-funnel.", timestamp: isoDaysAgo(2) },
    ],
  }),
  buildUDE({
    title: "Increase release cadence",
    owner: "Carol",
    category: "Product",
    status: "Closed",
    costImpact: 96000,
    dueDate: isoDaysAgo(14),
    metricName: "Releases / Month",
    baseline: 2,
    goal: 4,
    current: 4,
    lastWeek: 4,
    actions: [
      action({ text: "Automate regression suite", owner: "QA", status: "Done", dueDate: isoDaysAgo(20) }),
      action({ text: "Adopt release train", owner: "Engineering", status: "Done", dueDate: isoDaysAgo(16) }),
    ],
    activityLog: [
      { id: crypto.randomUUID(), message: "Created UDE Increase release cadence with metric Releases / Month.", timestamp: isoDaysAgo(90) },
      { id: crypto.randomUUID(), message: "UDE moved to Verified by Demo seed.", timestamp: isoDaysAgo(30) },
      { id: crypto.randomUUID(), message: "UDE closed by Demo seed and ROI logged.", timestamp: isoDaysAgo(14) },
    ],
  }),
];

export const loadDemoData = () => {
  if (process.env.NODE_ENV !== "development") {
    return;
  }
  const state = useUDEs.getState();
  if (state.udes.length > 0) {
    return;
  }
  useUDEs.setState({ udes: DEMO_DATA });
};
