import { formatCnpj } from "@/lib/utils";
import type { Desacordo } from "@/lib/types";

const COLS = ["Nota", "Emitente da devolução", "CNPJ referenciado", "Motivo"];

export function DesacordosTable({ rows }: { rows: Desacordo[] }) {
  return (
    <div className="border border-border rounded-lg bg-background/60 overflow-hidden">
      <div className="flex items-baseline justify-between px-4 py-2.5 border-b border-border">
        <span className="text-muted-foreground text-xs uppercase tracking-wider">
          Desacordos
        </span>
        <span className="text-xs tabular-nums text-amber-500 dark:text-amber-400 font-medium">
          {rows.length}
        </span>
      </div>

      {rows.length === 0 ? (
        <p className="px-4 py-3 text-xs text-muted-foreground">
          Todas as devoluções referenciam notas da empresa.
        </p>
      ) : (
        <div className="overflow-x-auto max-h-80 overflow-y-auto">
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-background">
              <tr className="border-b border-border">
                {COLS.map((c) => (
                  <th
                    key={c}
                    className="px-4 py-2 text-left font-medium text-muted-foreground whitespace-nowrap"
                  >
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((d, i) => (
                <tr key={i} className="hover:bg-muted/20">
                  <td className="px-4 py-2 tabular-nums text-foreground">
                    {d.nNF || "—"}
                  </td>
                  <td className="px-4 py-2 font-mono text-muted-foreground whitespace-nowrap">
                    {formatCnpj(d.cnpjDev)}
                  </td>
                  <td className="px-4 py-2 font-mono text-muted-foreground whitespace-nowrap">
                    {d.cnpjRef ? formatCnpj(d.cnpjRef) : "—"}
                  </td>
                  <td className="px-4 py-2 text-foreground whitespace-nowrap">
                    {d.motivo}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
