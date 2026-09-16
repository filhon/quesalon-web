"use client";

import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverAnchor,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
} from "@/components/ui/popover";
import { useCompany } from "@/components/dashboard/company-context";
import { NFE_KILL_SWITCH } from "@/lib/constants";
import { useLocal, writeLocal } from "@/lib/local-storage";
import type { NfeSource } from "@/lib/types";

const ONBOARDING_KEY = "onboarding-fonte-v1";
const LABEL: Record<NfeSource, string> = { sieg: "SIEG", emiteai: "Emite Aí" };

/** Seletor de fonte (SIEG / Emite Aí) + indicador da fonte que respondeu à última busca. */
export function SourceControl() {
  const { source, preferred, setPreferred } = useCompany();
  // no servidor conta como "já visto" para o popover não piscar na hidratação
  const onboarding = useLocal(ONBOARDING_KEY, "1") === null;
  const dismissOnboarding = () => writeLocal(ONBOARDING_KEY, "1");

  const loading = source === "loading";
  const dot =
    source === null ? null : loading ? (
      <Loader2
        className="size-3 animate-spin text-muted-foreground"
        aria-hidden="true"
      />
    ) : (
      <span
        className={`size-2 rounded-full ${source === "sieg" ? "bg-emerald-400" : "bg-amber-400"}`}
        title={`Última busca respondida por: ${LABEL[source]}`}
        aria-label={`Última busca respondida por ${LABEL[source]}`}
        role="img"
      />
    );

  // SIEG desligado de vez: sem escolha, só o indicador
  if (NFE_KILL_SWITCH) {
    return source === null ? null : (
      <span className="hidden sm:flex items-center gap-1.5 font-mono text-xs text-muted-foreground">
        {dot}
        Emite Aí
      </span>
    );
  }

  return (
    <Popover open={onboarding} onOpenChange={(o) => !o && dismissOnboarding()}>
      <PopoverAnchor asChild>
        <div
          className="hidden sm:flex items-center gap-2 rounded-md border border-border bg-card px-1.5 py-1"
          role="group"
          aria-label="Fonte das notas fiscais"
        >
          {dot}
          {(["sieg", "emiteai"] as const).map((s) => (
            <Button
              key={s}
              variant="ghost"
              size="sm"
              disabled={loading}
              aria-pressed={preferred === s}
              onClick={() => setPreferred(s)}
              className={[
                "h-6 px-2 font-mono text-xs",
                preferred === s
                  ? "bg-muted text-foreground"
                  : "text-muted-foreground hover:text-foreground",
              ].join(" ")}
            >
              {LABEL[s]}
            </Button>
          ))}
        </div>
      </PopoverAnchor>

      <PopoverContent align="center" sideOffset={10} className="w-80 p-4 gap-3">
        <PopoverHeader>
          <PopoverTitle>Nova fonte de notas fiscais</PopoverTitle>
          <PopoverDescription>
            O serviço SIEG será desativado em breve. O sistema agora também
            consulta o <strong>Emite Aí</strong>.
          </PopoverDescription>
        </PopoverHeader>
        <PopoverDescription>
          <strong>Padrão:</strong> cada busca tenta o SIEG primeiro; se ele não
          responder, o sistema muda sozinho para o Emite Aí e avisa no log. O
          ponto colorido mostra qual fonte respondeu na última busca.
        </PopoverDescription>
        <PopoverDescription>
          <strong>Manual:</strong> use este seletor para escolher a fonte. A
          escolha vale até você sair do sistema.
        </PopoverDescription>
        <PopoverDescription>
          Downloads de XML e DANFE existem apenas no SIEG.
        </PopoverDescription>
        <Button
          size="sm"
          onClick={dismissOnboarding}
          className="self-end bg-primary hover:bg-primary/90 text-primary-foreground"
        >
          Entendi
        </Button>
      </PopoverContent>
    </Popover>
  );
}
