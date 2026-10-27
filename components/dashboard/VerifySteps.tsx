import { Check, Loader2, AlertTriangle, X } from "lucide-react";

export interface Step {
  label: string;
  status: "running" | "ok" | "warn" | "error";
  /** Erro técnico das APIs, recolhido por padrão (útil para o suporte). */
  detail?: string;
}

const ICON = {
  running: <Loader2 className="size-3.5 animate-spin text-muted-foreground" />,
  ok: <Check className="size-3.5 text-emerald-600 dark:text-emerald-400" />,
  warn: (
    <AlertTriangle className="size-3.5 text-amber-600 dark:text-amber-400" />
  ),
  error: <X className="size-3.5 text-red-600 dark:text-red-400" />,
};

export function VerifySteps({ steps }: { steps: Step[] }) {
  if (steps.length === 0) return null;
  return (
    <ol className="flex flex-col gap-2 text-xs" aria-live="polite">
      {steps.map((s, i) => (
        <li key={i} className="flex items-start gap-2 leading-5">
          <span className="mt-0.75 shrink-0" aria-hidden="true">
            {ICON[s.status]}
          </span>
          <div className="min-w-0 flex flex-col gap-1">
            <span
              className={
                s.status === "error"
                  ? "text-red-600 dark:text-red-400"
                  : s.status === "running"
                    ? "text-foreground"
                    : "text-muted-foreground"
              }
            >
              {s.label}
            </span>
            {s.detail && (
              <details className="text-muted-foreground">
                <summary className="cursor-pointer w-fit hover:text-foreground">
                  Detalhes técnicos
                </summary>
                <p className="mt-1 font-mono break-all">{s.detail}</p>
              </details>
            )}
          </div>
        </li>
      ))}
    </ol>
  );
}
