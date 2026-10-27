"use client";

import { useEffect, useState } from "react";
import { get, ref } from "firebase/database";
import Link from "next/link";
import { AlertTriangle, Download, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { auth, db } from "@/lib/firebase";
import { getVerificationHistory, getReportHistory } from "@/lib/history";
import { fetchAndDownload } from "@/lib/download-utils";
import { formatCnpj } from "@/lib/utils";
import { SIEG_CAPTURE_END } from "@/lib/constants";
import type {
  NFeDoc,
  VerificationHistoryEntry,
  ReportHistoryEntry,
} from "@/lib/types";

function formatTs(ts: number): string {
  return new Date(ts).toLocaleString("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

/** "19/10 a 27/10/2026"; o ano só se repete quando muda. */
function formatPeriod({ from, to }: { from: string; to: string }): string {
  const [fy, fm, fd] = from.split("-");
  const [ty, tm, td] = to.split("-");
  return `${fd}/${fm}${fy === ty ? "" : `/${fy}`} a ${td}/${tm}/${ty}`;
}

/**
 * Período que passa do fim da captação do SIEG e não foi respondido pelo Emite Aí:
 * as notas posteriores a 07/10/2026 faltam. Registros antigos não guardavam a fonte e,
 * nesse caso, quem respondia era o SIEG (que devolvia 0 notas em vez de erro).
 */
const incompleta = (e: VerificationHistoryEntry) =>
  e.dateRange.to > SIEG_CAPTURE_END && e.source !== "emiteai";

const SOURCE_LABEL = { sieg: "SIEG", emiteai: "Emite Aí" } as const;

const countClass = (n: number, attention = false) =>
  n === 0
    ? "text-muted-foreground"
    : attention
      ? "text-amber-600 dark:text-amber-400 font-medium"
      : "text-foreground font-medium";

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

function VerificationsTable({
  entries,
  loading,
}: {
  entries: VerificationHistoryEntry[];
  loading: boolean;
}) {
  const total = entries.length;
  const cols = 8;

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
                  { label: "Fonte", cls: "" },
                  { label: "Notas", cls: "hidden md:table-cell" },
                  { label: "Devoluções", cls: "" },
                  { label: "Desacordos", cls: "" },
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
              ) : total === 0 ? (
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
                entries.map((e) => (
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
                    <td className="px-4 py-3 text-xs text-muted-foreground tabular-nums whitespace-nowrap">
                      {formatPeriod(e.dateRange)}
                    </td>
                    <td className="px-4 py-3 text-xs whitespace-nowrap">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-foreground">
                          {e.source ? SOURCE_LABEL[e.source] : "Não registrada"}
                        </span>
                        {incompleta(e) && (
                          <span
                            className="flex items-center gap-1 text-amber-700 dark:text-amber-400"
                            title="O SIEG só tem notas até 07/10/2026: as notas posteriores não entraram nesta verificação."
                          >
                            <AlertTriangle
                              className="size-3 shrink-0"
                              aria-hidden="true"
                            />
                            Incompleta após 07/10
                          </span>
                        )}
                      </div>
                    </td>
                    <td
                      className={`hidden md:table-cell px-4 py-3 text-xs tabular-nums ${countClass(e.counts.total)}`}
                    >
                      {e.counts.total.toLocaleString("pt-BR")}
                    </td>
                    <td
                      className={`px-4 py-3 text-xs tabular-nums ${countClass(e.counts.dev)}`}
                    >
                      {e.counts.dev.toLocaleString("pt-BR")}
                    </td>
                    <td
                      className={`px-4 py-3 text-xs tabular-nums ${countClass(e.counts.cnpjDesc, true)}`}
                    >
                      {e.counts.cnpjDesc.toLocaleString("pt-BR")}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
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
  const total = entries.length;

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
              ) : total === 0 ? (
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
                entries.map((e) => (
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
                    <td className="px-4 py-3 text-xs text-muted-foreground tabular-nums whitespace-nowrap">
                      {formatPeriod(e.dateRange)}
                    </td>
                    <td
                      className={`px-4 py-3 text-xs tabular-nums ${countClass(e.devCount)}`}
                    >
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
                        aria-label={`Baixar relatório de devoluções de ${e.company.label}, ${formatPeriod(e.dateRange)}`}
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
