"use client";

import { useEffect, useRef } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Props {
  log: string[];
  onClear: () => void;
}

function lineClass(entry: string): string {
  if (entry.includes("✓")) return "text-emerald-500 dark:text-emerald-400";
  if (entry.includes("✗")) return "text-red-500 dark:text-red-400";
  if (entry.includes("⚠")) return "text-amber-500 dark:text-amber-400";
  return "text-muted-foreground";
}

export function EventLog({ log, onClear }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "instant" });
  }, [log]);

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <span className="text-muted-foreground text-xs uppercase tracking-wider">
          Log de eventos
        </span>
        <Button
          variant="ghost"
          size="sm"
          onClick={onClear}
          aria-label="Limpar log de eventos"
          className="h-8 px-2 gap-1 text-muted-foreground hover:text-foreground hover:bg-muted/60"
        >
          <Trash2 className="size-3" />
          <span className="text-xs">Limpar</span>
        </Button>
      </div>

      <div
        className="rounded-lg border border-border bg-card/40 overflow-hidden"
        role="log"
        aria-label="Log de eventos"
      >
        <ScrollArea className="h-48">
          <div className="p-3 space-y-0.5 font-mono text-xs">
            {log.length === 0 ? (
              <p className="text-muted-foreground italic">
                Nenhum evento ainda…
              </p>
            ) : (
              log.map((entry, i) => (
                <p key={i} className={`leading-5 ${lineClass(entry)}`}>
                  {entry}
                </p>
              ))
            )}
            <div ref={bottomRef} />
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}
