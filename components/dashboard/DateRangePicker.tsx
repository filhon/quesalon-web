"use client";

import { useState } from "react";
import { format, startOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface DateRangeValue {
  from: Date;
  to: Date;
}

interface Props {
  value: DateRangeValue;
  onChange: (range: DateRangeValue) => void;
  disabled?: boolean;
}

function formatDate(d: Date): string {
  return format(d, "dd 'de' MMM yyyy", { locale: ptBR });
}

export function DateRangePicker({ value, onChange, disabled }: Props) {
  const [fromOpen, setFromOpen] = useState(false);
  const [toOpen, setToOpen] = useState(false);

  return (
    <div className="flex flex-col gap-3">
      {/* De */}
      <div className="flex flex-col gap-1.5">
        <Label
          htmlFor="date-from"
          className="text-muted-foreground text-xs uppercase tracking-wider"
        >
          De
        </Label>
        <Popover open={fromOpen} onOpenChange={setFromOpen}>
          <PopoverTrigger asChild>
            <Button
              id="date-from"
              variant="outline"
              disabled={disabled}
              className="w-full h-9 justify-start gap-2 bg-muted/60 border-border text-foreground hover:bg-muted/80 hover:text-foreground font-normal text-sm"
            >
              <CalendarIcon className="size-3.5 text-muted-foreground shrink-0" />
              <span>{formatDate(value.from)}</span>
            </Button>
          </PopoverTrigger>
          <PopoverContent
            className="w-auto p-0 bg-popover border-border"
            align="start"
          >
            <Calendar
              mode="single"
              selected={value.from}
              onSelect={(date) => {
                if (date) {
                  onChange({ from: date, to: value.to });
                  setFromOpen(false);
                }
              }}
              disabled={{ after: value.to }}
              defaultMonth={value.from}
              locale={ptBR}
            />
          </PopoverContent>
        </Popover>
      </div>

      {/* Até */}
      <div className="flex flex-col gap-1.5">
        <Label
          htmlFor="date-to"
          className="text-muted-foreground text-xs uppercase tracking-wider"
        >
          Até
        </Label>
        <Popover open={toOpen} onOpenChange={setToOpen}>
          <PopoverTrigger asChild>
            <Button
              id="date-to"
              variant="outline"
              disabled={disabled}
              className="w-full h-9 justify-start gap-2 bg-muted/60 border-border text-foreground hover:bg-muted/80 hover:text-foreground font-normal text-sm"
            >
              <CalendarIcon className="size-3.5 text-muted-foreground shrink-0" />
              <span>{formatDate(value.to)}</span>
            </Button>
          </PopoverTrigger>
          <PopoverContent
            className="w-auto p-0 bg-popover border-border"
            align="start"
          >
            <Calendar
              mode="single"
              selected={value.to}
              onSelect={(date) => {
                if (date) {
                  onChange({ from: value.from, to: date });
                  setToOpen(false);
                }
              }}
              disabled={{ before: value.from }}
              defaultMonth={value.to}
              locale={ptBR}
            />
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}

export function defaultDateRange(): DateRangeValue {
  const today = new Date();
  return { from: startOfMonth(today), to: today };
}
