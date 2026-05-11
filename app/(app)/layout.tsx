"use client";

import { useEffect, useState } from "react";
import { Syne } from "next/font/google";
import { LogOut, Layers, Mail, Clock } from "lucide-react";
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
      className="fixed top-0 inset-x-0 z-30 h-14 border-b border-zinc-800/80 bg-zinc-950/90 backdrop-blur-sm"
      style={{ fontFamily: "var(--font-syne)" }}
    >
      <div className="flex h-full items-center justify-between px-6">
        {/* Logo */}
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-400/10 border border-amber-400/20">
            <Layers className="size-3.5 text-amber-400" />
          </div>
          <span className="text-sm font-semibold tracking-tight text-zinc-100">
            Quesalon <span className="text-amber-400">RPA</span>
          </span>
        </div>

        {/* Center: selected company badge */}
        <Badge
          variant="outline"
          className="hidden sm:flex border-zinc-700 bg-zinc-900 text-zinc-300 font-mono text-xs gap-2 px-3 py-1"
        >
          <span className="text-zinc-500">{company.label}</span>
          <span className="text-amber-400/70">{formatCnpj(company.cnpj)}</span>
        </Badge>

        {/* User info + Logout */}
        <div className="flex items-center gap-3">
          {lastAccess && (
            <span className="hidden lg:flex items-center gap-1.5 text-xs text-zinc-600">
              <Clock className="size-3 shrink-0" />
              Último: {lastAccess}
            </span>
          )}
          {userEmail && (
            <span className="hidden md:flex items-center gap-1.5 text-xs text-zinc-500">
              <Mail className="size-3 shrink-0" />
              {userEmail}
            </span>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={signOut}
            aria-label="Sair da conta"
            className="gap-1.5 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/60 h-8 px-3"
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
        className={`${syne.variable} min-h-screen bg-zinc-950 text-zinc-50`}
        style={{
          backgroundImage: `
            radial-gradient(ellipse 80% 40% at 50% -10%, oklch(0.22 0.04 85 / 0.3) 0%, transparent 60%),
            linear-gradient(oklch(1 0 0 / 2%) 1px, transparent 1px),
            linear-gradient(90deg, oklch(1 0 0 / 2%) 1px, transparent 1px)
          `,
          backgroundSize: "100% 100%, 48px 48px, 48px 48px",
        }}
      >
        <AppHeader />
        <main className="pt-14 p-6 min-h-screen">{children}</main>
      </div>
    </CompanyProvider>
  );
}
