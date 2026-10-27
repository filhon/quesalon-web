"use client";

import { Skeleton } from "@/components/ui/skeleton";

interface Props {
  /** null = nenhuma verificação concluída: mostra "—", nunca um 0 que pareça resultado */
  total: number | null;
  dev: number | null;
  desc: number | null;
  loading?: boolean;
}

function StatItem({
  label,
  value,
  attention,
}: {
  label: string;
  value: number | null;
  attention?: boolean;
}) {
  return (
    <div className="px-5 py-4">
      <p className="text-xs text-muted-foreground font-medium mb-1.5">
        {label}
      </p>
      <p
        className={`text-2xl font-semibold tabular-nums tracking-tight ${
          value === null
            ? "text-muted-foreground"
            : attention && value > 0
              ? "text-amber-600 dark:text-amber-400"
              : "text-foreground"
        }`}
      >
        {value === null ? "—" : value.toLocaleString("pt-BR")}
      </p>
    </div>
  );
}

export function StatsCards({ total, dev, desc, loading }: Props) {
  return (
    <div className="border border-border rounded-lg bg-background/60">
      <div className="grid grid-cols-1 divide-y sm:grid-cols-3 sm:divide-y-0 sm:divide-x divide-border">
        {loading ? (
          [0, 1, 2].map((i) => (
            <div key={i} className="px-5 py-4 flex flex-col gap-2">
              <Skeleton className="w-24 h-3" />
              <Skeleton className="w-16 h-7" />
            </div>
          ))
        ) : (
          <>
            <StatItem label="Notas no período" value={total} />
            <StatItem label="Devoluções" value={dev} />
            <StatItem label="Desacordos" value={desc} attention />
          </>
        )}
      </div>
    </div>
  );
}
