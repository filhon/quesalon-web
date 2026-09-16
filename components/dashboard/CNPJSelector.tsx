"use client";

import { COMPANIES } from "@/lib/constants";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Company } from "@/lib/types";

function formatCnpj(raw: string): string {
  return raw.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5");
}

interface Props {
  value: Company;
  onSelect: (company: Company) => void;
  disabled?: boolean;
}

export function CNPJSelector({ value, onSelect, disabled }: Props) {
  function handleChange(cnpj: string) {
    const found = COMPANIES.find((c) => c.cnpj === cnpj);
    if (found) onSelect(found);
  }

  return (
    <div className="flex flex-col gap-1.5">
      <Label
        htmlFor="cnpj-select"
        className="text-muted-foreground text-xs uppercase tracking-wider"
      >
        Empresa / CNPJ
      </Label>
      <Select
        value={value.cnpj}
        onValueChange={handleChange}
        disabled={disabled}
      >
        <SelectTrigger
          id="cnpj-select"
          className="w-full h-9 bg-muted/60 border-border text-foreground focus:border-primary/50 focus:ring-primary/20"
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="bg-popover border-border">
          {COMPANIES.map((c) => (
            <SelectItem
              key={c.cnpj}
              value={c.cnpj}
              className="text-foreground focus:bg-muted focus:text-foreground"
            >
              <span className="font-medium">{c.label}</span>
              <span className="ml-2 font-mono text-xs text-muted-foreground">
                {formatCnpj(c.cnpj)}
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
