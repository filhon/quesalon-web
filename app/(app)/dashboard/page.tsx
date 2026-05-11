"use client";

import { useState } from "react";
import { Loader2, Search } from "lucide-react";
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
    setLoading(true);
    setLog([`⚠ Buscando NF-es para ${company.label}…`]);

    try {
      const batchRes = await fetch("/api/sieg/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cnpj: company.cnpj,
          startDate: dateRange.from.toISOString().slice(0, 10),
          endDate: dateRange.to.toISOString().slice(0, 10),
        }),
      });

      if (!batchRes.ok) throw new Error("Erro ao buscar notas");

      const { docs, total } = (await batchRes.json()) as {
        docs: NFeDoc[];
        total: number;
      };

      setLog((prev) => [...prev, `✓ ${total} nota(s) encontrada(s)`]);

      const verificationResult = verifyNFe(docs, company.cnpj);

      setLog((prev) => [
        ...prev,
        `✓ ${verificationResult.dev.length} devolução(ões) identificada(s)`,
        ...verificationResult.log,
        "✓ Verificação concluída",
      ]);

      setResult(verificationResult);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro desconhecido";
      setLog((prev) => [...prev, `✗ ${message}`]);
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
          <CNPJSelector value={company} onSelect={setCompany} />

          <Separator className="bg-zinc-800" />

          <DateRangePicker value={dateRange} onChange={setDateRange} />

          <Button
            onClick={handleVerify}
            disabled={loading}
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
          />

          <DownloadPanel result={result} />
        </div>
      </div>
    </div>
  );
}
