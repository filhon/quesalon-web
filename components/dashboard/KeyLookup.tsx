"use client";

import { useState } from "react";
import { FileCode, FileText, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { fetchAndDownload } from "@/lib/download-utils";

/** XML ou DANFE de uma nota avulsa, direto no SIEG; independe da verificação. */
export function KeyLookup() {
  const [key, setKey] = useState("");
  const [busy, setBusy] = useState<"xml" | "danfe" | null>(null);
  const complete = key.length === 44;

  async function download(type: "xml" | "danfe") {
    setBusy(type);
    try {
      await fetchAndDownload(
        type === "xml"
          ? `/api/sieg/xml?key=${key}&type=55`
          : `/api/sieg/danfe?key=${key}`,
        "GET",
        undefined,
        `${key}.${type === "xml" ? "xml" : "pdf"}`,
      );
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

  return (
    <div className="flex flex-col gap-2">
      <Label
        htmlFor="access-key"
        className="text-xs font-medium tracking-wider uppercase text-muted-foreground"
      >
        Nota avulsa por chave de acesso
      </Label>
      <Input
        id="access-key"
        inputMode="numeric"
        value={key}
        onChange={(e) => setKey(e.target.value.replace(/\D/g, "").slice(0, 44))}
        placeholder="44 dígitos"
        aria-describedby="access-key-count"
        className="h-9 bg-muted/60 border-border text-foreground placeholder:text-muted-foreground text-xs font-mono"
      />
      <p
        id="access-key-count"
        className="text-xs text-muted-foreground tabular-nums"
      >
        {key.length}/44 dígitos · notas até 07/10/2026, via SIEG
      </p>
      <div className="flex gap-2">
        {(["xml", "danfe"] as const).map((type) => (
          <Button
            key={type}
            variant="outline"
            disabled={!complete || busy !== null}
            onClick={() => download(type)}
            className="h-9 flex-1 gap-2 bg-muted/40 border-border text-foreground hover:bg-muted/60"
          >
            {busy === type ? (
              <Loader2 className="size-4 animate-spin text-muted-foreground" />
            ) : type === "xml" ? (
              <FileCode className="size-4 text-muted-foreground" />
            ) : (
              <FileText className="size-4 text-muted-foreground" />
            )}
            {type === "xml" ? "XML" : "DANFE"}
          </Button>
        ))}
      </div>
    </div>
  );
}
