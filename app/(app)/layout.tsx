"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Syne } from "next/font/google";
import { LogOut, Layers, Mail, Clock, Sun, Moon } from "lucide-react";
import { onAuthStateChanged } from "firebase/auth";
import { ref, onValue } from "firebase/database";
import { signOut } from "@/lib/auth-actions";
import { auth, db } from "@/lib/firebase";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  CompanyProvider,
  useCompany,
} from "@/components/dashboard/company-context";
import type { ReactNode } from "react";

const syne = Syne({
  subsets: ["latin"],
  variable: "--font-syne",
  display: "swap",
});

function formatCnpj(raw: string): string {
  return raw.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5");
}

function AppHeader() {
  const { company } = useCompany();
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [lastAccess, setLastAccess] = useState<string | null>(null);
  const { resolvedTheme, setTheme } = useTheme();

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (user) => {
      setUserEmail(user?.email ?? null);
    });
    const loginRef = ref(db, "log-login");
    const unsubDb = onValue(loginRef, (snap) => {
      const val = snap.val();
      if (val?.data) setLastAccess(val.data as string);
    });
    return () => {
      unsubAuth();
      unsubDb();
    };
  }, []);

  return (
    <header
      className="fixed top-0 inset-x-0 z-30 h-14 border-b border-border bg-background/90 backdrop-blur-sm"
      style={{ fontFamily: "var(--font-syne)" }}
    >
      <div className="flex h-full items-center justify-between px-6">
        {/* Logo */}
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-400/10 border border-amber-400/20">
            <Layers className="size-3.5 text-amber-400" aria-hidden="true" />
          </div>
          <span className="text-sm font-semibold tracking-tight text-foreground">
            Quesalon <span className="text-amber-400">RPA</span>
          </span>
        </div>

        {/* Center: selected company badge */}
        <Badge
          variant="outline"
          className="flex border-border bg-card text-foreground font-mono text-xs gap-2 px-3 py-1"
        >
          <span className="text-muted-foreground">{company.label}</span>
          <span className="text-amber-400/70">{formatCnpj(company.cnpj)}</span>
        </Badge>

        {/* User info + Logout */}
        <div className="flex items-center gap-3">
          {lastAccess && (
            <span className="hidden lg:flex items-center gap-1.5 text-xs text-muted-foreground">
              <Clock className="size-3 shrink-0" aria-hidden="true" />
              Último: {lastAccess}
            </span>
          )}
          {userEmail && (
            <span className="hidden md:flex items-center gap-1.5 text-xs text-muted-foreground">
              <Mail className="size-3 shrink-0" aria-hidden="true" />
              {userEmail}
            </span>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() =>
              setTheme(resolvedTheme === "dark" ? "light" : "dark")
            }
            aria-label="Alternar tema"
            className="text-muted-foreground hover:text-foreground hover:bg-muted/60 h-8 w-8 p-0"
          >
            {resolvedTheme === "dark" ? (
              <Sun className="size-3.5" />
            ) : (
              <Moon className="size-3.5" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={signOut}
            aria-label="Sair da conta"
            className="gap-1.5 text-muted-foreground hover:text-foreground hover:bg-muted/60 h-8 px-3"
          >
            <LogOut className="size-3.5" />
            <span className="hidden sm:inline text-xs">Sair</span>
          </Button>
        </div>
      </div>
    </header>
  );
}

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <CompanyProvider>
      <div
        className={`${syne.variable} min-h-screen bg-background text-foreground app-bg-gradient`}
      >
        <AppHeader />
        <h1 className="sr-only">
          Quesalon RPA — Sistema de Verificação Fiscal
        </h1>
        <main className="pt-14 p-4 md:p-6 min-h-screen">{children}</main>
      </div>
    </CompanyProvider>
  );
}
