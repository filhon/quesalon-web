"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import { COMPANIES, NFE_KILL_SWITCH } from "@/lib/constants";
import { useLocal, writeLocal } from "@/lib/local-storage";
import type { Company, NfeSource } from "@/lib/types";

/** Fonte usada na última busca: null antes da primeira, "loading" durante. */
export type SourceStatus = NfeSource | "loading" | null;

/** Escolha do usuário; "sieg" = padrão (SIEG com fallback automático). Limpa no logout. */
export const PREFERRED_SOURCE_KEY = "nfe-source-pref";

interface CompanyContextValue {
  company: Company;
  setCompany: (c: Company) => void;
  source: SourceStatus;
  setSource: (s: SourceStatus) => void;
  preferred: NfeSource;
  setPreferred: (s: NfeSource) => void;
}

const CompanyContext = createContext<CompanyContextValue>({
  company: COMPANIES[0],
  setCompany: () => {},
  source: null,
  setSource: () => {},
  preferred: "sieg",
  setPreferred: () => {},
});

export function CompanyProvider({ children }: { children: ReactNode }) {
  const [company, setCompany] = useState<Company>(COMPANIES[0]);
  const [source, setSource] = useState<SourceStatus>(null);
  const stored = useLocal(PREFERRED_SOURCE_KEY, null);
  const preferred: NfeSource =
    NFE_KILL_SWITCH || stored === "emiteai" ? "emiteai" : "sieg";

  return (
    <CompanyContext.Provider
      value={{
        company,
        setCompany,
        source,
        setSource,
        preferred,
        setPreferred: (s) => writeLocal(PREFERRED_SOURCE_KEY, s),
      }}
    >
      {children}
    </CompanyContext.Provider>
  );
}

export function useCompany(): CompanyContextValue {
  return useContext(CompanyContext);
}
