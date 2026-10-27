"use client";

import { useState, type ReactNode } from "react";
import { Archive, Download, Loader2, Sheet } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { fetchAndDownload } from "@/lib/download-utils";
import { NFE_KILL_SWITCH } from "@/lib/constants";
import { useCompany } from "@/components/dashboard/company-context";
import type { NFeDoc, VerificationResult } from "@/lib/types";

interface Props {
  result: VerificationResult;
  onReportDownloaded?: (devDocs: NFeDoc[]) => void;
}

const getKey = (doc: NFeDoc) => String(doc.nfeProc.protNFe.infProt.chNFe);

/** Arquivos da verificação concluída. Só é montado quando há resultado. */
export function DownloadPanel({ result, onReportDownloaded }: Props) {
  const [busy, setBusy] = useState<string | null>(null);
  const { source } = useCompany();
  // XML e DANFE em lote vêm do SIEG: indisponíveis quando a busca foi no Emite Aí
  const siegFiles = !NFE_KILL_SWITCH && source !== "emiteai";

  async function run(id: string, fn: () => Promise<void>) {
    setBusy(id);
    try {
      await fn();
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : "Não foi possível baixar o arquivo",
      );
    } finally {
      setBusy(null);
    }
  }

  const zip = (docs: NFeDoc[], type: "xml" | "danfe") => () =>
    fetchAndDownload(
      "/api/download/zip",
      "POST",
      { keys: docs.map(getKey), type },
      `quesalon_${type}_${Date.now()}.zip`,
    );

  async function excel() {
    await fetchAndDownload(
      "/api/report",
      "POST",
      { docs: result.dev },
      "relatorio_quesalon.xlsx",
    );
    onReportDownloaded?.(result.dev);
  }

  // função de render, não componente: um componente declarado aqui dentro remontaria a cada render
  function action(
    id: string,
    icon: ReactNode,
    label: string,
    count: number,
    onClick: () => Promise<void>,
  ) {
    return (
      <Button
        key={id}
        variant="outline"
        disabled={busy !== null || count === 0}
        onClick={() => run(id, onClick)}
        className="h-9 gap-2 bg-muted/40 border-border text-foreground hover:bg-muted/60"
      >
        {busy === id ? (
          <Loader2 className="size-4 animate-spin text-muted-foreground" />
        ) : (
          icon
        )}
        {label}
        <span className="text-muted-foreground tabular-nums">{count}</span>
      </Button>
    );
  }

  const all = [...result.dev, ...result.notDev];
  const icon = (I: typeof Archive) => (
    <I className="size-4 text-muted-foreground" aria-hidden="true" />
  );

  return (
    <section aria-labelledby="files-title" className="flex flex-col gap-3">
      <h3
        id="files-title"
        className="text-xs font-medium tracking-wider uppercase text-muted-foreground"
      >
        Arquivos
      </h3>

      <div className="flex flex-wrap gap-2">
        {action(
          "excel",
          icon(Sheet),
          "Relatório de devoluções (.xlsx)",
          result.dev.length,
          excel,
        )}
        {siegFiles && [
          action(
            "all-xml",
            icon(Archive),
            "XML de todas as notas",
            all.length,
            zip(all, "xml"),
          ),
          action(
            "dev-xml",
            icon(Archive),
            "XML das devoluções",
            result.dev.length,
            zip(result.dev, "xml"),
          ),
          action(
            "desc-xml",
            icon(Archive),
            "XML dos desacordos",
            result.cnpjDesc.length,
            zip(result.cnpjDesc, "xml"),
          ),
          action(
            "dev-danfe",
            icon(Download),
            "DANFE das devoluções",
            result.dev.length,
            zip(result.dev, "danfe"),
          ),
        ]}
      </div>

      {!NFE_KILL_SWITCH && !siegFiles && (
        <p className="text-xs text-muted-foreground">
          XML e DANFE em lote vêm do SIEG e não estão disponíveis para esta
          busca, feita no Emite Aí.
        </p>
      )}
    </section>
  );
}
