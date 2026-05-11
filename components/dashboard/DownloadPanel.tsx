"use client";

import { Download, FileSpreadsheet, Archive } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { VerificationResult } from "@/lib/types";

interface Props {
  result: VerificationResult | null;
}

export function DownloadPanel({ result }: Props) {
  const disabled = result === null;

  async function handleExcel() {
    if (!result) return;
    const res = await fetch("/api/report", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ docs: result.dev }),
    });
    if (!res.ok) return;
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "relatorio.xlsx";
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleZip(type: "xml" | "danfe") {
    if (!result) return;
    const keys = result.dev.map((d) => d.nfeProc.protNFe.infProt.chNFe);
    const res = await fetch("/api/download/zip", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ keys, type }),
    });
    if (!res.ok) return;
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${type === "xml" ? "xmls" : "danfes"}.zip`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <Card className="bg-zinc-900/60 border-zinc-800">
      <CardContent className="p-4 flex flex-col gap-3">
        <p className="text-zinc-400 text-xs uppercase tracking-wider">
          Downloads
        </p>

        <div className="flex flex-col gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={disabled}
            onClick={handleExcel}
            className="justify-start gap-2 bg-zinc-800/40 border-zinc-700/50 text-zinc-300 hover:bg-zinc-700/50 hover:text-zinc-100 disabled:opacity-40"
          >
            <FileSpreadsheet className="size-4 text-emerald-400" />
            Relatório Excel (.xlsx)
          </Button>

          <Button
            variant="outline"
            size="sm"
            disabled={disabled}
            onClick={() => handleZip("xml")}
            className="justify-start gap-2 bg-zinc-800/40 border-zinc-700/50 text-zinc-300 hover:bg-zinc-700/50 hover:text-zinc-100 disabled:opacity-40"
          >
            <Archive className="size-4 text-blue-400" />
            XMLs das devoluções (.zip)
          </Button>

          <Button
            variant="outline"
            size="sm"
            disabled={disabled}
            onClick={() => handleZip("danfe")}
            className="justify-start gap-2 bg-zinc-800/40 border-zinc-700/50 text-zinc-300 hover:bg-zinc-700/50 hover:text-zinc-100 disabled:opacity-40"
          >
            <Download className="size-4 text-amber-400" />
            DANFEs das devoluções (.zip)
          </Button>
        </div>

        {disabled && (
          <p className="text-zinc-600 text-xs">
            Execute uma verificação para habilitar os downloads.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
