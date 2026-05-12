"use client";

import { Skeleton } from "@/components/ui/skeleton";

interface Props {
  total: number;
  dev: number;
  desc: number;
  loading?: boolean;
}

interface StatItemProps {
  label: string;
  value: number;
  accent: string;
}

function StatItem({ label, value, accent }: StatItemProps) {
  return (
    <div className="px-5 py-4">
      <p className="text-xs text-muted-foreground font-medium mb-1.5">
        {label}
      </p>
      <p className={`text-2xl font-bold tabular-nums tracking-tight ${accent}`}>
        {value.toLocaleString("pt-BR")}
      </p>
    </div>
  );
}

export function StatsCards({ total, dev, desc, loading }: Props) {
  if (loading) {
    return (
      <div className="border border-border rounded-lg bg-background/60">
        <div className="grid grid-cols-1 divide-y sm:grid-cols-3 sm:divide-y-0 sm:divide-x divide-border">
          {[0, 1, 2].map((i) => (
            <div key={i} className="px-5 py-4 flex flex-col gap-2">
              <Skeleton className="w-24 h-3" />
              <Skeleton className="w-16 h-7" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="border border-border rounded-lg bg-background/60">
      <div className="grid grid-cols-1 divide-y sm:grid-cols-3 sm:divide-y-0 sm:divide-x divide-border">
        <StatItem
          label="Total verificadas"
          value={total}
          accent="text-foreground"
        />
        <StatItem
          label="Devoluções"
          value={dev}
          accent="text-blue-500 dark:text-blue-400"
        />
        <StatItem
          label="Desacordos"
          value={desc}
          accent="text-amber-500 dark:text-amber-400"
        />
      </div>
    </div>
  );
}
