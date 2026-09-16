"use client";

import { useEffect, useState } from "react";
import { get, ref } from "firebase/database";
import Link from "next/link";
import { Download, Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { auth, db } from "@/lib/firebase";
import { getVerificationHistory, getReportHistory } from "@/lib/history";
import { fetchAndDownload } from "@/lib/download-utils";
import { formatCnpj } from "@/lib/utils";
import type {
  NFeDoc,
  VerificationHistoryEntry,
  ReportHistoryEntry,
} from "@/lib/types";

const PAGE_SIZE = 10;

function formatTs(ts: number): string {
  return new Date(ts).toLocaleString("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

function formatDate(iso: string): string {
  return iso.split("-").reverse().join("/");
}

function usePagination<T>(items: T[]) {
  const [page, setPage] = useState(0);
  const total = items.length;
  const pageCount = Math.ceil(total / PAGE_SIZE);
  const start = page * PAGE_SIZE;
  const slice = items.slice(start, start + PAGE_SIZE);

  function prev() {
    setPage((p) => Math.max(0, p - 1));
  }
  function next() {
    setPage((p) => Math.min(pageCount - 1, p + 1));
  }

  return { slice, page, pageCount, total, start, prev, next };
}

function TableSkeleton({ cols }: { cols: number }) {
  return (
    <>
      {Array.from({ length: 5 }).map((_, i) => (
        <tr key={i} className="border-b border-border last:border-0">
          {Array.from({ length: cols }).map((__, j) => (
            <td key={j} className="px-4 py-3">
              <Skeleton className="h-3.5 w-full max-w-30" />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

function EmptyRow({
  cols,
  message,
}: {
  cols: number;
  message: React.ReactNode;
}) {
  return (
    <tr>
      <td
        colSpan={cols}
        className="px-4 py-10 text-center text-sm text-muted-foreground"
      >
        {message}
      </td>
    </tr>
  );
}

function Pagination({
  page,
  pageCount,
  total,
  start,
  onPrev,
  onNext,
}: {
  page: number;
  pageCount: number;
  total: number;
  start: number;
  onPrev: () => void;
  onNext: () => void;
}) {
  if (total <= PAGE_SIZE) return null;

  const end = Math.min(start + PAGE_SIZE, total);

  return (
    <div className="flex items-center justify-between px-4 py-2.5 border-t border-border">
      <span className="text-xs text-muted-foreground tabular-nums">
        {start + 1}–{end} de {total}
      </span>
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={onPrev}
          disabled={page === 0}
          className="h-7 px-2 text-muted-foreground hover:text-foreground disabled:opacity-30 gap-1"
        >
          <ChevronLeft className="size-3.5" />
          <span className="text-xs">Anterior</span>
        </Button>
        <span className="text-xs text-muted-foreground tabular-nums px-1">
          {page + 1}/{pageCount}
        </span>
        <Button
          variant="ghost"
          size="sm"
          onClick={onNext}
          disabled={page >= pageCount - 1}
          className="h-7 px-2 text-muted-foreground hover:text-foreground disabled:opacity-30 gap-1"
        >
          <span className="text-xs">Próxima</span>
          <ChevronRight className="size-3.5" />
        </Button>
      </div>
    </div>
  );
}

function VerificationsTable({
  entries,
  loading,
}: {
  entries: VerificationHistoryEntry[];
  loading: boolean;
}) {
  const { slice, page, pageCount, total, start, prev, next } =
    usePagination(entries);

  const cols = 7;

  return (
    <section>
      <div className="mb-3 flex items-baseline gap-2">
        <h2 className="text-sm font-semibold text-foreground">Verificações</h2>
        {!loading && (
          <span className="text-xs text-muted-foreground tabular-nums">
            {total} {total === 1 ? "registro" : "registros"}
          </span>
        )}
      </div>

      <div className="rounded-lg border border-border overflow-hidden bg-card/40">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                {[
                  { label: "Data/hora", cls: "" },
                  { label: "Usuário", cls: "hidden md:table-cell" },
                  { label: "Empresa", cls: "" },
                  { label: "Período", cls: "" },
                  { label: "Total", cls: "hidden md:table-cell" },
                  { label: "Dev.", cls: "" },
                  { label: "Desc.", cls: "" },
                ].map(({ label, cls }) => (
                  <th
                    key={label}
                    className={`px-4 py-2.5 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider whitespace-nowrap ${cls}`}
                  >
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <TableSkeleton cols={cols} />
              ) : slice.length === 0 ? (
                <EmptyRow
                  cols={cols}
                  message={
                    <>
                      Nenhuma verificação registrada.{" "}
                      <Link
                        href="/dashboard"
                        className="text-foreground underline underline-offset-2 hover:text-primary transition-colors"
                      >
                        Execute uma no Dashboard.
                      </Link>
                    </>
                  }
                />
              ) : (
                slice.map((e) => (
                  <tr
                    key={e.id}
                    className="hover:bg-muted/20 transition-colors duration-100"
                  >
                    <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap tabular-nums">
                      {formatTs(e.timestamp)}
                    </td>
                    <td
                      className="hidden md:table-cell px-4 py-3 text-xs text-foreground max-w-45 truncate"
                      title={e.userEmail}
                    >
                      {e.userEmail}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-xs text-foreground">
                          {e.company.label}
                        </span>
                        <span className="text-xs text-muted-foreground font-mono">
                          {formatCnpj(e.company.cnpj)}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground tabular-nums">
                      <div className="flex flex-col gap-0.5">
                        <span>{formatDate(e.dateRange.from)}</span>
                        <span className="text-muted-foreground/60">
                          {formatDate(e.dateRange.to)}
                        </span>
                      </div>
                    </td>
                    <td className="hidden md:table-cell px-4 py-3 text-xs text-foreground tabular-nums font-medium">
                      {e.counts.total.toLocaleString("pt-BR")}
                    </td>
                    <td className="px-4 py-3 text-xs text-blue-500 dark:text-blue-400 tabular-nums font-medium">
                      {e.counts.dev.toLocaleString("pt-BR")}
                    </td>
                    <td className="px-4 py-3 text-xs text-amber-500 dark:text-amber-400 tabular-nums font-medium">
                      {e.counts.cnpjDesc.toLocaleString("pt-BR")}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <Pagination
          page={page}
          pageCount={pageCount}
          total={total}
          start={start}
          onPrev={prev}
          onNext={next}
        />
      </div>
    </section>
  );
}

function ReportsTable({
  entries,
  loading,
}: {
  entries: ReportHistoryEntry[];
  loading: boolean;
}) {
  const [busy, setBusy] = useState<string | null>(null);
  const { slice, page, pageCount, total, start, prev, next } =
    usePagination(entries);

  const cols = 6;

  async function handleDownload(
    id: string,
    company: string,
    from: string,
    to: string,
  ) {
    setBusy(id);
    try {
      const snap = await get(ref(db, `history/reports/${id}`));
      if (!snap.exists()) throw new Error("Relatório não encontrado");
      const { docs: docsJson } = snap.val() as { docs: string };
      const docs = JSON.parse(docsJson) as NFeDoc[];
      const filename = `relatorio_${company.replace(/\s+/g, "_")}_${from}_${to}.xlsx`;
      await fetchAndDownload("/api/report", "POST", { docs }, filename);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Erro ao baixar relatório",
      );
    } finally {
      setBusy(null);
    }
  }

  return (
    <section>
      <div className="mb-3 flex items-baseline gap-2">
        <h2 className="text-sm font-semibold text-foreground">Relatórios</h2>
        {!loading && (
          <span className="text-xs text-muted-foreground tabular-nums">
            {total} {total === 1 ? "registro" : "registros"}
          </span>
        )}
      </div>

      <div className="rounded-lg border border-border overflow-hidden bg-card/40">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                {[
                  { label: "Data/hora", cls: "" },
                  { label: "Usuário", cls: "hidden md:table-cell" },
                  { label: "Empresa", cls: "" },
                  { label: "Período", cls: "" },
                  { label: "Devoluções", cls: "" },
                  { label: "Arquivo", cls: "" },
                ].map(({ label, cls }) => (
                  <th
                    key={label}
                    className={`px-4 py-2.5 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider whitespace-nowrap ${cls}`}
                  >
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <TableSkeleton cols={cols} />
              ) : slice.length === 0 ? (
                <EmptyRow
                  cols={cols}
                  message={
                    <>
                      Nenhum relatório gerado ainda.{" "}
                      <Link
                        href="/dashboard"
                        className="text-foreground underline underline-offset-2 hover:text-primary transition-colors"
                      >
                        Gere um no Dashboard.
                      </Link>
                    </>
                  }
                />
              ) : (
                slice.map((e) => (
                  <tr
                    key={e.id}
                    className="hover:bg-muted/20 transition-colors duration-100"
                  >
                    <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap tabular-nums">
                      {formatTs(e.timestamp)}
                    </td>
                    <td
                      className="hidden md:table-cell px-4 py-3 text-xs text-foreground max-w-45 truncate"
                      title={e.userEmail}
                    >
                      {e.userEmail}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-xs text-foreground">
                          {e.company.label}
                        </span>
                        <span className="text-xs text-muted-foreground font-mono">
                          {formatCnpj(e.company.cnpj)}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground tabular-nums">
                      <div className="flex flex-col gap-0.5">
                        <span>{formatDate(e.dateRange.from)}</span>
                        <span className="text-muted-foreground/60">
                          {formatDate(e.dateRange.to)}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-blue-500 dark:text-blue-400 tabular-nums font-medium">
                      {e.devCount.toLocaleString("pt-BR")}
                    </td>
                    <td className="px-4 py-3">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={busy === e.id}
                        onClick={() =>
                          handleDownload(
                            e.id!,
                            e.company.label,
                            e.dateRange.from,
                            e.dateRange.to,
                          )
                        }
                        className="h-7 px-2.5 text-xs gap-1.5 bg-muted/40 border-border text-foreground hover:bg-muted/60 disabled:opacity-40"
                        aria-label="Baixar relatório Excel"
                      >
                        {busy === e.id ? (
                          <Loader2 className="size-3 animate-spin" />
                        ) : (
                          <Download className="size-3" />
                        )}
                        .xlsx
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <Pagination
          page={page}
          pageCount={pageCount}
          total={total}
          start={start}
          onPrev={prev}
          onNext={next}
        />
      </div>
    </section>
  );
}

export default function HistoricoPage() {
  const [verifications, setVerifications] = useState<
    VerificationHistoryEntry[]
  >([]);
  const [reports, setReports] = useState<ReportHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        // Wait for Firebase Auth to restore session before reading RTDB
        await auth.authStateReady();
        const [v, r] = await Promise.all([
          getVerificationHistory(),
          getReportHistory(),
        ]);
        setVerifications(v);
        setReports(r);
      } catch (err) {
        console.error("[histórico] erro ao carregar:", err);
        toast.error(
          err instanceof Error ? err.message : "Erro ao carregar histórico",
        );
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-foreground tracking-tight">
          Histórico
        </h2>
        <p className="text-muted-foreground text-sm mt-2 leading-relaxed">
          Auditoria das últimas 30 verificações e relatórios gerados por todos
          os usuários.
        </p>
      </div>

      <div className="flex flex-col gap-8">
        <VerificationsTable entries={verifications} loading={loading} />
        <ReportsTable entries={reports} loading={loading} />
      </div>
    </div>
  );
}
