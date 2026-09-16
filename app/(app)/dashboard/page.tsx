"use client";

import { useState } from "react";
import { format } from "date-fns";
import { Loader2, Search } from "lucide-react";
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
import { useCompany } from "@/components/dashboard/company-context";
import { verifyNFe } from "@/lib/verify";
import { saveVerificationHistory, saveReportHistory } from "@/lib/history";
import { auth } from "@/lib/firebase";
import type { NFeDoc, NfeSource, VerificationResult } from "@/lib/types";

export default function DashboardPage() {
  const { company, setCompany, setSource, preferred } = useCompany();
  const [dateRange, setDateRange] = useState(defaultDateRange());
  const [result, setResult] = useState<VerificationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [steps, setSteps] = useState<Step[]>([]);

  const addStep = (label: string) =>
    setSteps((s) => [...s, { label, status: "running" }]);
  // Fecha o último passo (o que está "running") com o resultado
  const endStep = (label: string, status: Step["status"] = "ok") =>
    setSteps((s) =>
      s.map((st, i) => (i === s.length - 1 ? { label, status } : st)),
    );

  async function handleVerify() {
    if (!company) {
      toast.error("Selecione uma empresa");
      return;
    }
    if (!dateRange?.from || !dateRange?.to) {
      toast.error("Selecione o período");
      return;
    }

    setLoading(true);
    setSource("loading");
    setSteps([]);
    setResult(null);

    try {
      const startDate = format(dateRange.from, "yyyy-MM-dd");
      const endDate = format(dateRange.to, "yyyy-MM-dd");

      addStep(`Buscando NF-es de ${company.label}…`);

      const batchRes = await fetch("/api/sieg/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cnpj: company.cnpj,
          startDate,
          endDate,
          preferred,
        }),
      });

      if (!batchRes.ok) throw new Error("Erro ao buscar notas");

      const { docs, total, source, fallbackReason } =
        (await batchRes.json()) as {
          docs: NFeDoc[];
          total: number;
          source: NfeSource;
          fallbackReason?: string;
        };

      setSource(source);
      if (fallbackReason) {
        toast.warning("SIEG indisponível — buscando no Emite Aí");
        endStep(`SIEG indisponível: ${fallbackReason}`, "warn");
        addStep("Buscando no Emite Aí…");
      }

      if (total === 0) {
        toast.warning("Nenhuma nota encontrada no período");
      }

      endStep(
        `${total} nota(s) encontrada(s) via ${source === "sieg" ? "SIEG" : "Emite Aí"}`,
      );

      addStep("Verificando devoluções…");
      const verificationResult = verifyNFe(docs, company.cnpj);
      const nDesc = verificationResult.desacordos.length;
      endStep(
        `${verificationResult.dev.length} devolução(ões) · ${nDesc} desacordo(s)`,
        nDesc > 0 ? "warn" : "ok",
      );

      setResult(verificationResult);
      toast.success(`${total} nota(s) verificada(s)`);

      try {
        const userEmail = auth.currentUser?.email ?? "";
        await saveVerificationHistory({
          timestamp: Date.now(),
          userEmail,
          company: { label: company.label, cnpj: company.cnpj },
          dateRange: { from: startDate, to: endDate },
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
      const message = err instanceof Error ? err.message : "Erro desconhecido";
      setSource(null);
      endStep(message, "error");
      toast.error(message);
    } finally {
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
          NF-es por empresa e período
        </p>
      </div>

      <div className="grid sm:grid-cols-[260px_1fr] md:grid-cols-[320px_1fr] gap-6">
        {/* Left column */}
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

          <Button
            onClick={handleVerify}
            disabled={loading}
            aria-label={
              loading ? "Verificando notas..." : "Verificar notas fiscais"
            }
            className="w-full h-10 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold transition-colors duration-200 disabled:opacity-60 gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Verificando…
              </>
            ) : (
              <>
                <Search className="size-4" />
                Verificar
              </>
            )}
          </Button>

          <VerifySteps steps={steps} />
        </div>

        {/* Right column */}
        <div className="flex flex-col gap-5">
          <StatsCards
            total={result ? result.dev.length + result.notDev.length : 0}
            dev={result ? result.dev.length : 0}
            desc={result ? result.cnpjDesc.length : 0}
            loading={loading}
          />

          {result && <DesacordosTable rows={result.desacordos} />}

          <DownloadPanel
            result={result}
            loading={loading}
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
        </div>
      </div>
    </div>
  );
}
