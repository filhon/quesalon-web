"use client";

import { FileText, RotateCcw, AlertTriangle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface Props {
  total: number;
  dev: number;
  desc: number;
  loading?: boolean;
}

interface StatCardProps {
  label: string;
  value: number;
  icon: React.ReactNode;
  accent: string;
  bgAccent: string;
  borderAccent: string;
}

function StatCard({
  label,
  value,
  icon,
  accent,
  bgAccent,
  borderAccent,
}: StatCardProps) {
  return (
    <Card className={`bg-zinc-900/60 border ${borderAccent} flex-1 min-w-0`}>
      <CardContent className="p-4 flex flex-col gap-3">
        <div
          className={`w-8 h-8 rounded-lg ${bgAccent} border ${borderAccent} flex items-center justify-center`}
        >
          <span className={`${accent} [&_svg]:size-4`}>{icon}</span>
        </div>
        <div>
          <p className="text-zinc-400 text-xs uppercase tracking-wider leading-none mb-1.5">
            {label}
          </p>
          <p className={`text-2xl font-semibold tabular-nums ${accent}`}>
            {value.toLocaleString("pt-BR")}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function SkeletonCard() {
  return (
    <Card className="bg-zinc-900/60 border-zinc-700/50 min-w-0">
      <CardContent className="p-4 flex flex-col gap-3">
        <Skeleton className="w-8 h-8 rounded-lg" />
        <div className="flex flex-col gap-1.5">
          <Skeleton className="w-20 h-3" />
          <Skeleton className="w-12 h-7" />
        </div>
      </CardContent>
    </Card>
  );
}

export function StatsCards({ total, dev, desc, loading }: Props) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      <StatCard
        label="Total verificadas"
        value={total}
        icon={<FileText />}
        accent="text-zinc-300"
        bgAccent="bg-zinc-800/60"
        borderAccent="border-zinc-700/50"
      />
      <StatCard
        label="Devoluções"
        value={dev}
        icon={<RotateCcw />}
        accent="text-blue-400"
        bgAccent="bg-blue-500/10"
        borderAccent="border-blue-500/20"
      />
      <StatCard
        label="Desacordos"
        value={desc}
        icon={<AlertTriangle />}
        accent="text-amber-400"
        bgAccent="bg-amber-400/10"
        borderAccent="border-amber-400/20"
      />
    </div>
  );
}
