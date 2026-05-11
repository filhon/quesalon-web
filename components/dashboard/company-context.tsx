"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import { COMPANIES } from "@/lib/constants";
import type { Company } from "@/lib/types";

interface CompanyContextValue {
  company: Company;
  setCompany: (c: Company) => void;
}

const CompanyContext = createContext<CompanyContextValue>({
  company: COMPANIES[0],
  setCompany: () => {},
});

export function CompanyProvider({ children }: { children: ReactNode }) {
  const [company, setCompany] = useState<Company>(COMPANIES[0]);
  return (
    <CompanyContext.Provider value={{ company, setCompany }}>
      {children}
    </CompanyContext.Provider>
  );
}

export function useCompany(): CompanyContextValue {
  return useContext(CompanyContext);
}
