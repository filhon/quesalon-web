"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signInWithEmailAndPassword } from "firebase/auth";
import { ref, update } from "firebase/database";
import { Loader2 } from "lucide-react";
import { QuesalonLogo } from "@/components/quesalon-logo";
import { auth, db } from "@/lib/firebase";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

const ERROR_MESSAGES: Record<string, string> = {
  "auth/wrong-password": "Senha incorreta",
  "auth/user-not-found": "Usuário não encontrado",
  "auth/invalid-email": "E-mail inválido",
  "auth/invalid-credential": "Credenciais inválidas",
  "auth/too-many-requests": "Muitas tentativas. Tente novamente mais tarde",
  "auth/network-request-failed": "Erro de conexão. Verifique sua internet",
};

function formatTimestamp(date: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(date.getDate())}/${p(date.getMonth() + 1)}/${date.getFullYear()} ${p(date.getHours())}:${p(date.getMinutes())}:${p(date.getSeconds())}`;
}

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const credential = await signInWithEmailAndPassword(
        auth,
        email,
        password,
      );
      const idToken = await credential.user.getIdToken();

      // Persist session token in cookie (24h)
      document.cookie = `session=${idToken}; path=/; max-age=${60 * 60 * 24}; SameSite=Lax`;

      // Log login in Firebase RTDB
      await update(ref(db, "log-login"), {
        data: formatTimestamp(new Date()),
        "e-mail": email,
      });

      router.push("/dashboard");
    } catch (err: unknown) {
      const code = (err as { code?: string }).code ?? "";
      setError(ERROR_MESSAGES[code] ?? "Ocorreu um erro. Tente novamente");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-sm motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-4 motion-safe:duration-500">
      <Card className="bg-card border border-border ring-0">
        <CardHeader className="pb-2 pt-8 px-8">
          {/* Logo mark */}
          <div className="flex flex-col items-center gap-4 mb-2">
            <div className="relative">
              <QuesalonLogo className="size-14 text-amber-400" />
            </div>
            <div className="text-center">
              <h1
                className="text-foreground text-xl font-semibold tracking-tight"
                style={{ fontFamily: "var(--font-syne)" }}
              >
                Quesalon RPA
              </h1>
              <p className="text-muted-foreground text-xs mt-0.5 tracking-wide uppercase">
                Sistema de Verificação Fiscal
              </p>
            </div>
          </div>

          {/* Divider */}
          <div className="h-px bg-border mt-4" />
        </CardHeader>

        <CardContent className="px-8 pb-8">
          <form onSubmit={handleSubmit} className="flex flex-col gap-5 mt-4">
            <div className="flex flex-col gap-1.5">
              <Label
                htmlFor="email"
                className="text-muted-foreground text-xs uppercase tracking-wider"
              >
                E-mail
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                disabled={loading}
                className="bg-muted/60 border-border text-foreground placeholder:text-muted-foreground focus-visible:border-amber-400/50 focus-visible:ring-amber-400/20 h-10"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label
                htmlFor="password"
                className="text-muted-foreground text-xs uppercase tracking-wider"
              >
                Senha
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                disabled={loading}
                className="bg-muted/60 border-border text-foreground placeholder:text-muted-foreground focus-visible:border-amber-400/50 focus-visible:ring-amber-400/20 h-10"
              />
            </div>

            {error && (
              <p className="text-red-400 text-sm text-center animate-in fade-in duration-300">
                {error}
              </p>
            )}

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-10 bg-amber-400 hover:bg-amber-300 text-zinc-950 font-semibold transition-colors duration-200 disabled:opacity-60 mt-1"
            >
              {loading ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  <span>Entrando…</span>
                </>
              ) : (
                "Entrar"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
