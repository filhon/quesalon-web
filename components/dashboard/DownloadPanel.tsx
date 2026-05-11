"use client";

import { useState } from "react";
import {
  FileCode,
  FileText,
  Sheet,
  Archive,
  Download,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { fetchAndDownload } from "@/lib/download-utils";
import type { NFeDoc, VerificationResult } from "@/lib/types";

interface Props {
  result: VerificationResult | null;
  loading: boolean;
}

function getKey(doc: NFeDoc): string {
  return String(doc.nfeProc.protNFe.infProt.chNFe);
}

export function DownloadPanel({ result, loading }: Props) {
  const [accessKey, setAccessKey] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  const disabled = result === null || loading;

  async function run(id: string, fn: () => Promise<void>) {
    setBusy(id);
    try {
      await fn();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro desconhecido";
      toast.error(msg);
    } finally {
      setBusy(null);
    }
  }

  async function handleBatchZip(
    docs: NFeDoc[],
    type: "xml" | "danfe",
    label: string,
  ) {
    const keys = docs.map(getKey);
    if (keys.length === 0) {
      toast.warning("Nenhuma nota encontrada");
      return;
    }
    toast.info(`Preparando download: ${label}…`);
    await fetchAndDownload(
      "/api/download/zip",
      "POST",
      { keys, type },
      `quesalon_${type}_${Date.now()}.zip`,
    );
  }

  async function handleSingleXml() {
    const key = accessKey.trim();
    if (key.length !== 44) {
      toast.warning("A chave de acesso deve ter 44 dígitos");
      return;
    }
    toast.info("Preparando download XML…");
    await fetchAndDownload(
      `/api/sieg/xml?key=${key}&type=55`,
      "GET",
      undefined,
      `${key}.xml`,
    );
  }

  async function handleSingleDanfe() {
    const key = accessKey.trim();
    if (key.length !== 44) {
      toast.warning("A chave de acesso deve ter 44 dígitos");
      return;
    }
    toast.info("Preparando download DANFE…");
    await fetchAndDownload(
      `/api/sieg/danfe?key=${key}`,
      "GET",
      undefined,
      `${key}.pdf`,
    );
  }

  async function handleExcel() {
    if (!result) return;
    toast.info("Gerando relatório Excel…");
    await fetchAndDownload(
      "/api/report",
      "POST",
      { docs: result.dev },
      "relatorio_quesalon.xlsx",
    );
  }

  const allKeys = result ? [...result.dev, ...result.notDev] : [];

  return (
    <Card className="bg-zinc-900/60 border-zinc-800">
      <CardHeader className="px-5 pt-5 pb-0">
        <p className="text-zinc-400 text-xs uppercase tracking-wider font-medium">
          Downloads
        </p>
      </CardHeader>

      <CardContent className="p-5 flex flex-col gap-5">
        {/* Batch downloads */}
        <div className="flex flex-col gap-2">
          <p className="text-zinc-500 text-xs font-medium">Downloads em Lote</p>

          <Button
            variant="outline"
            size="sm"
            disabled={disabled || busy !== null}
            onClick={() =>
              run("all-xml", () =>
                handleBatchZip(allKeys, "xml", "Todos (XML)"),
              )
            }
            className="justify-start gap-2 bg-zinc-800/40 border-zinc-700/50 text-zinc-300 hover:bg-zinc-700/50 hover:text-zinc-100 disabled:opacity-40"
            aria-label="Baixar todos os XMLs em ZIP"
          >
            <Archive className="size-4 text-blue-400" />
            Todos (XML)
            {busy === "all-xml" && (
              <Loader2 className="ml-auto size-3.5 animate-spin text-zinc-500" />
            )}
          </Button>

          <Button
            variant="outline"
            size="sm"
            disabled={disabled || busy !== null}
            onClick={() =>
              run("dev-xml", () =>
                handleBatchZip(result!.dev, "xml", "Devoluções (XML)"),
              )
            }
            className="justify-start gap-2 bg-zinc-800/40 border-zinc-700/50 text-zinc-300 hover:bg-zinc-700/50 hover:text-zinc-100 disabled:opacity-40"
            aria-label="Baixar XMLs de devoluções em ZIP"
          >
            <Archive className="size-4 text-amber-400" />
            Devoluções (XML)
            {busy === "dev-xml" && (
              <Loader2 className="ml-auto size-3.5 animate-spin text-zinc-500" />
            )}
          </Button>

          <Button
            variant="outline"
            size="sm"
            disabled={disabled || busy !== null}
            onClick={() =>
              run("desc-xml", () =>
                handleBatchZip(result!.cnpjDesc, "xml", "Desacordos (XML)"),
              )
            }
            className="justify-start gap-2 bg-zinc-800/40 border-zinc-700/50 text-zinc-300 hover:bg-zinc-700/50 hover:text-zinc-100 disabled:opacity-40"
            aria-label="Baixar XMLs de desacordos em ZIP"
          >
            <Archive className="size-4 text-red-400" />
            Desacordos (XML)
            {busy === "desc-xml" && (
              <Loader2 className="ml-auto size-3.5 animate-spin text-zinc-500" />
            )}
          </Button>

          <Button
            variant="outline"
            size="sm"
            disabled={disabled || busy !== null}
            onClick={() =>
              run("dev-danfe", () =>
                handleBatchZip(result!.dev, "danfe", "Devoluções (DANFE)"),
              )
            }
            className="justify-start gap-2 bg-zinc-800/40 border-zinc-700/50 text-zinc-300 hover:bg-zinc-700/50 hover:text-zinc-100 disabled:opacity-40"
            aria-label="Baixar DANFEs de devoluções em ZIP"
          >
            <Download className="size-4 text-emerald-400" />
            Devoluções (PDF/DANFE)
            {busy === "dev-danfe" && (
              <Loader2 className="ml-auto size-3.5 animate-spin text-zinc-500" />
            )}
          </Button>
        </div>

        <Separator className="bg-zinc-800" />

        {/* Per access key */}
        <div className="flex flex-col gap-2">
          <p className="text-zinc-500 text-xs font-medium">
            Por Chave de Acesso
          </p>

          <Input
            value={accessKey}
            onChange={(e) =>
              setAccessKey(e.target.value.replace(/\D/g, "").slice(0, 44))
            }
            placeholder="Digite a chave de acesso (44 dígitos)"
            maxLength={44}
            className="h-9 bg-zinc-800/60 border-zinc-700/50 text-zinc-100 placeholder:text-zinc-600 text-xs font-mono"
          />

          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={busy !== null}
              onClick={() => run("key-xml", handleSingleXml)}
              className="flex-1 justify-center gap-2 bg-zinc-800/40 border-zinc-700/50 text-zinc-300 hover:bg-zinc-700/50 hover:text-zinc-100 disabled:opacity-40"
              aria-label="Baixar XML por chave de acesso"
            >
              <FileCode className="size-4 text-blue-400" />
              XML
            </Button>

            <Button
              variant="outline"
              size="sm"
              disabled={busy !== null}
              onClick={() => run("key-danfe", handleSingleDanfe)}
              className="flex-1 justify-center gap-2 bg-zinc-800/40 border-zinc-700/50 text-zinc-300 hover:bg-zinc-700/50 hover:text-zinc-100 disabled:opacity-40"
              aria-label="Baixar DANFE por chave de acesso"
            >
              <FileText className="size-4 text-amber-400" />
              DANFE
            </Button>
          </div>
        </div>

        <Separator className="bg-zinc-800" />

        {/* Report */}
        <div className="flex flex-col gap-2">
          <p className="text-zinc-500 text-xs font-medium">Relatório</p>

          <Button
            variant="outline"
            size="sm"
            disabled={disabled || busy !== null}
            onClick={() => run("excel", handleExcel)}
            className="justify-start gap-2 bg-zinc-800/40 border-zinc-700/50 text-zinc-300 hover:bg-zinc-700/50 hover:text-zinc-100 disabled:opacity-40"
            aria-label="Gerar relatório Excel"
          >
            <Sheet className="size-4 text-emerald-400" />
            Gerar Excel (.xlsx)
            {busy === "excel" && (
              <Loader2 className="ml-auto size-3.5 animate-spin text-zinc-500" />
            )}
          </Button>
        </div>

        {disabled && !loading && (
          <p className="text-zinc-600 text-xs">
            Execute uma verificação para habilitar os downloads em lote.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
