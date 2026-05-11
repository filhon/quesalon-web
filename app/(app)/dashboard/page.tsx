"use client";

import { useState } from "react";
import { format } from "date-fns";
import { Loader2, Search } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { CNPJSelector } from "@/components/dashboard/CNPJSelector";
import {
  DateRangePicker,
  defaultDateRange,
} from "@/components/dashboard/DateRangePicker";
import { StatsCards } from "@/components/dashboard/StatsCards";
import { EventLog } from "@/components/dashboard/EventLog";
import { DownloadPanel } from "@/components/dashboard/DownloadPanel";
import { useCompany } from "@/components/dashboard/company-context";
import { verifyNFe } from "@/lib/verify";
import type { NFeDoc, VerificationResult } from "@/lib/types";

export default function DashboardPage() {
  const { company, setCompany } = useCompany();
  const [dateRange, setDateRange] = useState(defaultDateRange());
  const [result, setResult] = useState<VerificationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [log, setLog] = useState<string[]>([]);

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
    setLog([]);
    setResult(null);

    try {
      const startDate = format(dateRange.from, "yyyy-MM-dd");
      const endDate = format(dateRange.to, "yyyy-MM-dd");

      setLog([`⚠ Buscando NF-es para ${company.label}…`]);

      const batchRes = await fetch("/api/sieg/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cnpj: company.cnpj, startDate, endDate }),
      });

      if (!batchRes.ok) throw new Error("Erro ao buscar notas");

      const { docs, total } = (await batchRes.json()) as {
        docs: NFeDoc[];
        total: number;
      };

      if (total === 0) {
        toast.warning("Nenhuma nota encontrada no período");
      }

      setLog((prev) => [...prev, `✓ ${total} nota(s) encontrada(s)`]);

      const verificationResult = verifyNFe(docs, company.cnpj);

      setLog((prev) => [
        ...prev,
        `✓ ${verificationResult.dev.length} devolução(ões) identificada(s)`,
        ...verificationResult.log,
        "✓ Verificação concluída",
      ]);

      setResult(verificationResult);
      toast.success(`${total} nota(s) verificada(s)`);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro desconhecido";
      setLog((prev) => [...prev, `✗ ${message}`]);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-6">
        <h2
          className="text-lg font-semibold text-zinc-100 tracking-tight"
          style={{ fontFamily: "var(--font-syne)" }}
        >
          Verificação Fiscal
        </h2>
        <p className="text-zinc-500 text-sm mt-0.5">
          Consulte e valide NF-es por empresa e período
        </p>
      </div>

      <div className="grid md:grid-cols-[320px_1fr] gap-6 items-start">
        {/* Left column */}
        <div className="flex flex-col gap-5 rounded-xl border border-zinc-800 bg-zinc-900/40 p-5">
          <CNPJSelector
            value={company}
            onSelect={setCompany}
            disabled={loading}
          />

          <Separator className="bg-zinc-800" />

          <DateRangePicker
            value={dateRange}
            onChange={setDateRange}
            disabled={loading}
          />

          <Button
            onClick={handleVerify}
            disabled={loading}
            aria-label={
              loading ? "Verificando notas..." : "Verificar notas fiscais"
            }
            className="w-full h-9 bg-amber-400 hover:bg-amber-300 text-zinc-950 font-semibold transition-colors duration-200 disabled:opacity-60 gap-2"
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

          <Separator className="bg-zinc-800" />

          <EventLog log={log} onClear={() => setLog([])} />
        </div>

        {/* Right column */}
        <div className="flex flex-col gap-5">
          <StatsCards
            total={result ? result.dev.length + result.notDev.length : 0}
            dev={result ? result.dev.length : 0}
            desc={result ? result.cnpjDesc.length : 0}
            loading={loading}
          />

          <DownloadPanel result={result} loading={loading} />
        </div>
      </div>
    </div>
  );
}
