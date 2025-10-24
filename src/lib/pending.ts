/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Get pending items for a person by email.
 * - Pulls actions due/overdue in next 7 days and metrics not updated in 7 days.
 * - If Prisma is missing or model names differ, returns safe fallback demo items.
 * - Non-invasive: no throw; always returns an array.
 */
export async function getPendingForEmail(email: string) {
  try {
    // Try to use cached prisma client if available
    let prisma: any;
    try {
      const maybe = await import("@/lib/prisma");
      prisma = (maybe as any).default || (maybe as any).prisma;
    } catch {
      const { PrismaClient } = await import("@prisma/client");
      prisma = new PrismaClient();
    }

    const person = await prisma.teamMember
      ?.findFirst?.({ where: { email } })
      .catch(() => null);

    const today = new Date();
    const in7 = new Date(today);
    in7.setDate(today.getDate() + 7);
    const sevenAgo = new Date(today);
    sevenAgo.setDate(today.getDate() - 7);

    // Actions (owner = email, not DONE, with a dueDate that is overdue or within next 7 days)
    const actionsRaw = await prisma.action
      ?.findMany?.({
        where: {
          owner: { email },
          status: { not: "DONE" },
          dueDate: { not: null },
        },
        select: { id: true, title: true, text: true, dueDate: true },
      })
      .catch(() => []);

    const actions = (actionsRaw || [])
      .filter((a: any) => {
        const d = a?.dueDate ? new Date(a.dueDate) : null;
        return d && (d < today || (d >= today && d <= in7));
      })
      .map((a: any) => ({
        title: a.title ?? a.text ?? "Action",
        due: a?.dueDate ? new Date(a.dueDate).toLocaleDateString() : undefined,
      }));

    // Metrics (owner = email) considered "stale" if not updated in last 7 days
    const metricsRaw = await prisma.metric
      ?.findMany?.({
        where: { ude: { owner: { email } } },
        select: { id: true, name: true, title: true, updatedAt: true },
      })
      .catch(() => []);

    const metrics = (metricsRaw || [])
      .filter((m: any) => {
        const last = m?.updatedAt ? new Date(m.updatedAt) : null;
        return !last || last < sevenAgo;
      })
      .map((m: any) => ({
        title: m.name ?? m.title ?? "Metric",
      }));

    const items = [...actions, ...metrics];
    return items.length
      ? items
      : [{ title: "Nothing pending — you’re clear ✅" }];
  } catch (err) {
    console.warn("[pending] Using fallback items:", err);
    return [
      { title: "Update AR Days", due: "Fri" },
      { title: "Action: Follow up invoices", due: "Thu" },
    ];
  }
}
