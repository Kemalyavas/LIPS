import { prisma } from "@/lib/prisma";
import { FileText, Clock, PenLine, CheckCircle, MessageSquare } from "lucide-react";

export default async function DashboardPage() {
  const [total, pending, drafts, ready, commented] = await Promise.all([
    prisma.post.count({ where: { status: { not: "SKIPPED" } } }),
    prisma.post.count({ where: { status: "PENDING_REVIEW" } }),
    prisma.post.count({ where: { status: "DRAFT_GENERATED" } }),
    prisma.post.count({ where: { status: "READY" } }),
    prisma.post.count({ where: { status: "COMMENTED" } }),
  ]);

  const stats = [
    { label: "Total Posts", value: total, icon: FileText, color: "text-zinc-400" },
    { label: "Pending Review", value: pending, icon: Clock, color: "text-amber-500" },
    { label: "Drafts", value: drafts, icon: PenLine, color: "text-violet-500" },
    { label: "Ready", value: ready, icon: CheckCircle, color: "text-emerald-500" },
    { label: "Commented", value: commented, icon: MessageSquare, color: "text-blue-500" },
  ];

  return (
    <div>
      <div className="mb-8">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Dashboard</h2>
        <p className="text-sm text-zinc-500 mt-0.5">Overview of your LinkedIn engagement pipeline</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.label}
              className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4"
            >
              <div className="flex items-center gap-2 mb-3">
                <Icon className={`h-3.5 w-3.5 ${stat.color}`} />
                <span className="text-[11px] font-medium text-zinc-500 uppercase tracking-wide">
                  {stat.label}
                </span>
              </div>
              <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 tabular-nums">
                {stat.value}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
