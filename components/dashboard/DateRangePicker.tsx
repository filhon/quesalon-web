"use client";

import { useState } from "react";
import { format, startOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon } from "lucide-react";
import { type DateRange } from "react-day-picker";
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

  function handleFromSelect(range: DateRange | undefined) {
    if (range?.from) {
      onChange({ from: range.from, to: value.to });
      setFromOpen(false);
    }
  }

  function handleToSelect(range: DateRange | undefined) {
    if (range?.from) {
      onChange({ from: value.from, to: range.from });
      setToOpen(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {/* De */}
      <div className="flex flex-col gap-1.5">
        <Label
          htmlFor="date-from"
          className="text-zinc-400 text-xs uppercase tracking-wider"
        >
          De
        </Label>
        <Popover open={fromOpen} onOpenChange={setFromOpen}>
          <PopoverTrigger asChild>
            <Button
              id="date-from"
              variant="outline"
              disabled={disabled}
              className="w-full h-9 justify-start gap-2 bg-zinc-800/60 border-zinc-700/50 text-zinc-100 hover:bg-zinc-700/50 hover:text-zinc-100 font-normal text-sm"
            >
              <CalendarIcon className="size-3.5 text-zinc-500 shrink-0" />
              <span>{formatDate(value.from)}</span>
            </Button>
          </PopoverTrigger>
          <PopoverContent
            className="w-auto p-0 bg-zinc-900 border-zinc-700"
            align="start"
          >
            <Calendar
              mode="range"
              selected={{ from: value.from, to: value.to }}
              onSelect={handleFromSelect}
              defaultMonth={value.from}
              locale={ptBR}
              classNames={{
                root: "bg-zinc-900",
                months: "bg-zinc-900",
                month: "bg-zinc-900",
              }}
            />
          </PopoverContent>
        </Popover>
      </div>

      {/* Até */}
      <div className="flex flex-col gap-1.5">
        <Label
          htmlFor="date-to"
          className="text-zinc-400 text-xs uppercase tracking-wider"
        >
          Até
        </Label>
        <Popover open={toOpen} onOpenChange={setToOpen}>
          <PopoverTrigger asChild>
            <Button
              id="date-to"
              variant="outline"
              disabled={disabled}
              className="w-full h-9 justify-start gap-2 bg-zinc-800/60 border-zinc-700/50 text-zinc-100 hover:bg-zinc-700/50 hover:text-zinc-100 font-normal text-sm"
            >
              <CalendarIcon className="size-3.5 text-zinc-500 shrink-0" />
              <span>{formatDate(value.to)}</span>
            </Button>
          </PopoverTrigger>
          <PopoverContent
            className="w-auto p-0 bg-zinc-900 border-zinc-700"
            align="start"
          >
            <Calendar
              mode="range"
              selected={{ from: value.from, to: value.to }}
              onSelect={handleToSelect}
              defaultMonth={value.to}
              locale={ptBR}
              classNames={{
                root: "bg-zinc-900",
                months: "bg-zinc-900",
                month: "bg-zinc-900",
              }}
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
