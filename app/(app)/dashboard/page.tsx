"use client";

import { useRef, useState } from "react";
import { format } from "date-fns";
import { Loader2, RotateCw, Search } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { CNPJSelector } from "@/components/dashboard/CNPJSelector";
import {
  DateRangePicker,
  defaultDateRange,
} from "@/components/dashboard/DateRangePicker";
import { StatsCards } from "@/components/dashboard/StatsCards";
import { VerifySteps, type Step } from "@/components/dashboard/VerifySteps";
import { DesacordosTable } from "@/components/dashboard/DesacordosTable";
import { DownloadPanel } from "@/components/dashboard/DownloadPanel";
import { KeyLookup } from "@/components/dashboard/KeyLookup";
import { useCompany } from "@/components/dashboard/company-context";
import { verifyNFe } from "@/lib/verify";
import { saveVerificationHistory, saveReportHistory } from "@/lib/history";
import { auth } from "@/lib/firebase";
import { NFE_KILL_SWITCH } from "@/lib/constants";
import type { NFeDoc, NfeSource, VerificationResult } from "@/lib/types";

const SOURCE_LABEL: Record<NfeSource, string> = {
  sieg: "SIEG",
  emiteai: "Emite Aí",
};

export default function DashboardPage() {
  const { company, setCompany, setSource } = useCompany();
  const [dateRange, setDateRange] = useState(defaultDateRange());
  const [result, setResult] = useState<VerificationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [steps, setSteps] = useState<Step[]>([]);
  const abortRef = useRef<AbortController | null>(null);
  const failed = steps.at(-1)?.status === "error";

  const addStep = (label: string) =>
    setSteps((s) => [...s, { label, status: "running" }]);
  // Fecha o último passo (o que está "running") com o resultado
  const endStep = (
    label: string,
    status: Step["status"] = "ok",
    detail?: string,
  ) =>
    setSteps((s) =>
      s.map((st, i) => (i === s.length - 1 ? { label, status, detail } : st)),
    );

  async function handleVerify() {
    if (!dateRange?.from || !dateRange?.to) {
      toast.error("Selecione o período");
      return;
    }

    const abort = new AbortController();
    abortRef.current = abort;
    setLoading(true);
    setSource("loading");
    setSteps([]);
    setResult(null);

    try {
      const startDate = format(dateRange.from, "yyyy-MM-dd");
      const endDate = format(dateRange.to, "yyyy-MM-dd");

      addStep(`Buscando as notas de ${company.label}…`);

      const batchRes = await fetch("/api/sieg/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cnpj: company.cnpj, startDate, endDate }),
        signal: abort.signal,
      });

      if (!batchRes.ok) {
        const { error, detail } = await batchRes.json().catch(() => ({}));
        setSource(null);
        endStep(
          error ?? "Não foi possível buscar as notas. Tente de novo.",
          "error",
          detail,
        );
        return;
      }

      const { docs, total, source, fallbackReason, canceladas } =
        (await batchRes.json()) as {
          docs: NFeDoc[];
          total: number;
          source: NfeSource;
          fallbackReason?: string;
          canceladas: number;
        };

      setSource(source);
      if (fallbackReason) {
        endStep(
          "O SIEG não respondeu; a busca foi feita no Emite Aí.",
          "warn",
          fallbackReason,
        );
        addStep("Buscando no Emite Aí…");
      }

      endStep(
        (total === 0
          ? `Nenhuma nota no período (fonte: ${SOURCE_LABEL[source]})`
          : `${total} nota(s) encontrada(s) (fonte: ${SOURCE_LABEL[source]})`) +
          (canceladas ? ` · ${canceladas} cancelada(s) ignorada(s)` : ""),
      );

      addStep("Verificando devoluções…");
      const verificationResult = verifyNFe(docs, company.cnpj);
      const nDesc = verificationResult.desacordos.length;
      endStep(
        `${verificationResult.dev.length} devolução(ões) · ${nDesc} desacordo(s)`,
        nDesc > 0 ? "warn" : "ok",
      );

      setResult(verificationResult);

      try {
        const userEmail = auth.currentUser?.email ?? "";
        await saveVerificationHistory({
          timestamp: Date.now(),
          userEmail,
          company: { label: company.label, cnpj: company.cnpj },
          dateRange: { from: startDate, to: endDate },
          source,
          counts: {
            total,
            dev: verificationResult.dev.length,
            notDev: verificationResult.notDev.length,
            cnpjAcor: verificationResult.cnpjAcor.length,
            cnpjDesc: verificationResult.cnpjDesc.length,
          },
        });
      } catch {
        // History save is non-blocking
      }
    } catch (err) {
      setSource(null);
      if (abort.signal.aborted) {
        endStep("Busca cancelada.", "warn");
      } else {
        endStep(
          "Sem conexão com o servidor. Verifique a internet e tente de novo.",
          "error",
          err instanceof Error ? err.message : String(err),
        );
      }
    } finally {
      abortRef.current = null;
      setLoading(false);
    }
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-foreground tracking-tight">
          Verificação Fiscal
        </h2>
        <p className="text-muted-foreground text-sm mt-2 leading-relaxed">
          Devoluções recebidas por empresa e período, com as que referenciam
          notas de outro CNPJ.
        </p>
      </div>

      <div className="grid sm:grid-cols-[260px_1fr] md:grid-cols-[320px_1fr] gap-6 items-start">
        {/* Left column: o que verificar */}
        <div className="flex flex-col gap-5 rounded-xl border border-border bg-card/40 p-5">
          <div className="flex flex-col gap-3">
            <CNPJSelector
              value={company}
              onSelect={setCompany}
              disabled={loading}
            />

            <DateRangePicker
              value={dateRange}
              onChange={setDateRange}
              disabled={loading}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Button
              onClick={handleVerify}
              disabled={loading}
              className="w-full h-10 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold transition-colors duration-200 disabled:opacity-60 gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Verificando…
                </>
              ) : failed ? (
                <>
                  <RotateCw className="size-4" />
                  Tentar de novo
                </>
              ) : (
                <>
                  <Search className="size-4" />
                  Verificar
                </>
              )}
            </Button>
            {loading && (
              <Button
                variant="ghost"
                onClick={() => abortRef.current?.abort()}
                className="w-full h-8 text-xs text-muted-foreground hover:text-foreground"
              >
                Cancelar busca
              </Button>
            )}
          </div>

          <VerifySteps steps={steps} />

          {!NFE_KILL_SWITCH && (
            <div className="border-t border-border pt-5">
              <KeyLookup />
            </div>
          )}
        </div>

        {/* Right column: resultado */}
        <div className="flex flex-col gap-6">
          <StatsCards
            total={result ? result.dev.length + result.notDev.length : null}
            dev={result ? result.dev.length : null}
            desc={result ? result.cnpjDesc.length : null}
            loading={loading}
          />

          {result ? (
            <>
              <DesacordosTable rows={result.desacordos} />
              <DownloadPanel
                result={result}
                onReportDownloaded={async (devDocs) => {
                  if (!dateRange?.from || !dateRange?.to) return;
                  try {
                    const userEmail = auth.currentUser?.email ?? "";
                    await saveReportHistory(
                      {
                        timestamp: Date.now(),
                        userEmail,
                        company: { label: company.label, cnpj: company.cnpj },
                        dateRange: {
                          from: format(dateRange.from, "yyyy-MM-dd"),
                          to: format(dateRange.to, "yyyy-MM-dd"),
                        },
                        devCount: devDocs.length,
                      },
                      devDocs,
                    );
                  } catch {
                    // History save is non-blocking
                  }
                }}
              />
            </>
          ) : (
            !loading && (
              <p className="text-sm text-muted-foreground leading-relaxed max-w-prose">
                Escolha a empresa e o período e clique em{" "}
                <strong className="font-medium text-foreground">
                  Verificar
                </strong>
                . Os desacordos e os arquivos para baixar (relatório, XML e
                DANFE) aparecem aqui.
              </p>
            )
          )}
        </div>
      </div>
    </div>
  );
}
