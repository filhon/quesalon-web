"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import { COMPANIES } from "@/lib/constants";
import type { Company, NfeSource } from "@/lib/types";

/** Fonte usada na última busca: null antes da primeira, "loading" durante. */
export type SourceStatus = NfeSource | "loading" | null;

interface CompanyContextValue {
  company: Company;
  setCompany: (c: Company) => void;
  source: SourceStatus;
  setSource: (s: SourceStatus) => void;
}

const CompanyContext = createContext<CompanyContextValue>({
  company: COMPANIES[0],
  setCompany: () => {},
  source: null,
  setSource: () => {},
});

export function CompanyProvider({ children }: { children: ReactNode }) {
  const [company, setCompany] = useState<Company>(COMPANIES[0]);
  const [source, setSource] = useState<SourceStatus>(null);

  return (
    <CompanyContext.Provider value={{ company, setCompany, source, setSource }}>
      {children}
    </CompanyContext.Provider>
  );
}

export function useCompany(): CompanyContextValue {
  return useContext(CompanyContext);
}
