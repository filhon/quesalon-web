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
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { fetchAndDownload } from "@/lib/download-utils";
import { NFE_KILL_SWITCH } from "@/lib/constants";
import { useCompany } from "@/components/dashboard/company-context";
import type { NFeDoc, VerificationResult } from "@/lib/types";

interface Props {
  result: VerificationResult | null;
  loading: boolean;
  onReportDownloaded?: (devDocs: NFeDoc[]) => void;
}

function getKey(doc: NFeDoc): string {
  return String(doc.nfeProc.protNFe.infProt.chNFe);
}

export function DownloadPanel({ result, loading, onReportDownloaded }: Props) {
  const [accessKey, setAccessKey] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const { source } = useCompany();

  const disabled = result === null || loading;
  // XML e DANFE só existem no SIEG: bloqueados quando a busca caiu para o Emite Aí
  const siegOnlyDisabled = busy !== null || source === "emiteai";

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
    onReportDownloaded?.(result.dev);
  }

  const allKeys = result ? [...result.dev, ...result.notDev] : [];

  return (
    <Card className="bg-card border-border">
      <CardHeader className="px-5 pt-5 pb-0">
        <p className="text-muted-foreground text-xs uppercase tracking-wider font-medium">
          Downloads
        </p>
      </CardHeader>

      <CardContent className="p-5 flex flex-col gap-5">
        {/* XML/DANFE: serviços exclusivos do SIEG — somem de vez com o kill-switch */}
        {!NFE_KILL_SWITCH && (
          <>
            {/* Batch downloads */}
            <div className="flex flex-col gap-2">
              <p className="text-muted-foreground text-xs font-medium">
                Downloads em Lote
              </p>

              {source === "emiteai" && (
                <p className="text-amber-600 dark:text-amber-400 text-xs">
                  XML e DANFE indisponíveis: a busca foi feita no Emite Aí.
                </p>
              )}

              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  disabled={disabled || siegOnlyDisabled}
                  onClick={() =>
                    run("all-xml", () =>
                      handleBatchZip(allKeys, "xml", "Todos (XML)"),
                    )
                  }
                  className="h-10 justify-start gap-2 bg-muted/40 border-border text-foreground hover:bg-muted/60 disabled:opacity-40"
                  aria-label="Baixar todos os XMLs em ZIP"
                >
                  <Archive className="size-4 shrink-0 text-blue-500 dark:text-blue-400" />
                  <span className="truncate text-sm">Todos (XML)</span>
                  {busy === "all-xml" && (
                    <Loader2 className="ml-auto size-3.5 shrink-0 animate-spin text-muted-foreground" />
                  )}
                </Button>

                <Button
                  variant="outline"
                  disabled={disabled || siegOnlyDisabled}
                  onClick={() =>
                    run("dev-xml", () =>
                      handleBatchZip(result!.dev, "xml", "Devoluções (XML)"),
                    )
                  }
                  className="h-10 justify-start gap-2 bg-muted/40 border-border text-foreground hover:bg-muted/60 disabled:opacity-40"
                  aria-label="Baixar XMLs de devoluções em ZIP"
                >
                  <Archive className="size-4 shrink-0 text-amber-500 dark:text-amber-400" />
                  <span className="truncate text-sm">Devoluções (XML)</span>
                  {busy === "dev-xml" && (
                    <Loader2 className="ml-auto size-3.5 shrink-0 animate-spin text-muted-foreground" />
                  )}
                </Button>

                <Button
                  variant="outline"
                  disabled={disabled || siegOnlyDisabled}
                  onClick={() =>
                    run("desc-xml", () =>
                      handleBatchZip(
                        result!.cnpjDesc,
                        "xml",
                        "Desacordos (XML)",
                      ),
                    )
                  }
                  className="h-10 justify-start gap-2 bg-muted/40 border-border text-foreground hover:bg-muted/60 disabled:opacity-40"
                  aria-label="Baixar XMLs de desacordos em ZIP"
                >
                  <Archive className="size-4 shrink-0 text-red-500 dark:text-red-400" />
                  <span className="truncate text-sm">Desacordos (XML)</span>
                  {busy === "desc-xml" && (
                    <Loader2 className="ml-auto size-3.5 shrink-0 animate-spin text-muted-foreground" />
                  )}
                </Button>

                <Button
                  variant="outline"
                  disabled={disabled || siegOnlyDisabled}
                  onClick={() =>
                    run("dev-danfe", () =>
                      handleBatchZip(
                        result!.dev,
                        "danfe",
                        "Devoluções (DANFE)",
                      ),
                    )
                  }
                  className="h-10 justify-start gap-2 bg-muted/40 border-border text-foreground hover:bg-muted/60 disabled:opacity-40"
                  aria-label="Baixar DANFEs de devoluções em ZIP"
                >
                  <Download className="size-4 shrink-0 text-emerald-500 dark:text-emerald-400" />
                  <span className="truncate text-sm">Devoluções (DANFE)</span>
                  {busy === "dev-danfe" && (
                    <Loader2 className="ml-auto size-3.5 shrink-0 animate-spin text-muted-foreground" />
                  )}
                </Button>
              </div>
            </div>

            <Separator />

            {/* Per access key */}
            <div className="flex flex-col gap-2">
              <p className="text-muted-foreground text-xs font-medium">
                Por Chave de Acesso
              </p>

              <Label
                htmlFor="access-key"
                className="text-xs text-muted-foreground"
              >
                Chave de Acesso
              </Label>
              <Input
                id="access-key"
                value={accessKey}
                onChange={(e) =>
                  setAccessKey(e.target.value.replace(/\D/g, "").slice(0, 44))
                }
                placeholder="Digite a chave de acesso (44 dígitos)"
                maxLength={44}
                className="h-9 bg-muted/60 border-border text-foreground placeholder:text-muted-foreground text-xs font-mono"
              />

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="default"
                  disabled={siegOnlyDisabled}
                  onClick={() => run("key-xml", handleSingleXml)}
                  className="h-10 flex-1 justify-center gap-2 bg-muted/40 border-border text-foreground hover:bg-muted/60 disabled:opacity-40"
                  aria-label="Baixar XML por chave de acesso"
                >
                  <FileCode className="size-4 text-blue-500 dark:text-blue-400" />
                  XML
                </Button>

                <Button
                  variant="outline"
                  size="default"
                  disabled={siegOnlyDisabled}
                  onClick={() => run("key-danfe", handleSingleDanfe)}
                  className="h-10 flex-1 justify-center gap-2 bg-muted/40 border-border text-foreground hover:bg-muted/60 disabled:opacity-40"
                  aria-label="Baixar DANFE por chave de acesso"
                >
                  <FileText className="size-4 text-amber-500 dark:text-amber-400" />
                  DANFE
                </Button>
              </div>
            </div>

            <Separator />
          </>
        )}

        {/* Report — funciona nas duas fontes */}
        <div className="flex flex-col gap-2">
          <p className="text-muted-foreground text-xs font-medium">Relatório</p>

          <Button
            variant="outline"
            size="sm"
            disabled={disabled || busy !== null}
            onClick={() => run("excel", handleExcel)}
            className="h-10 justify-start gap-2 bg-muted/40 border-border text-foreground hover:bg-muted/60 disabled:opacity-40"
            aria-label="Gerar relatório Excel"
          >
            <Sheet className="size-4 text-emerald-500 dark:text-emerald-400" />
            Gerar Excel (.xlsx)
            {busy === "excel" && (
              <Loader2 className="ml-auto size-3.5 animate-spin text-muted-foreground" />
            )}
          </Button>
        </div>

        {disabled && !loading && (
          <p className="text-muted-foreground text-xs">
            Execute uma verificação para habilitar os downloads.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
