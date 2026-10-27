"use client";

import { Loader2 } from "lucide-react";
import { useCompany } from "@/components/dashboard/company-context";
import type { NfeSource } from "@/lib/types";

const LABEL: Record<NfeSource, string> = { sieg: "SIEG", emiteai: "Emite Aí" };

/** Fonte que respondeu à última busca. A escolha é automática (ver lib/nfe-source.ts). */
export function SourceControl() {
  const { source } = useCompany();
  if (source === null) return null;

  return (
    <span className="hidden sm:flex items-center gap-1.5 text-xs text-muted-foreground">
      {source === "loading" ? (
        <>
          <Loader2 className="size-3 animate-spin" aria-hidden="true" />
          Buscando notas…
        </>
      ) : (
        <>Fonte: {LABEL[source]}</>
      )}
    </span>
  );
}
