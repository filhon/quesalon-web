// extensões explícitas para os scripts/test-*.mjs rodarem direto no Node
import { fetchSiegNFe } from "./sieg.ts";
import { fetchNFeRecebidas } from "./emiteai.ts";
import type { NFeDoc, NfeSource } from "./types";

export interface NfeFetchResult {
  docs: NFeDoc[];
  source: NfeSource;
  /** Presente quando o SIEG falhou e a busca caiu para o Emite Aí. */
  fallbackReason?: string;
}

const FAILURES_TO_OPEN = 3;
const RETRY_AFTER_MS = 30 * 60_000;

// ponytail: circuit breaker em memória — cada instância serverless tem o seu e ele zera no cold start.
// Se precisar de estado durável entre instâncias, guardar `failures`/`openedAt` no RTDB.
let failures = 0;
let openedAt = 0;

function siegAllowed(): boolean {
  // kill-switch operacional (NEXT_PUBLIC_ para a UI também enxergar); lido aqui em vez de
  // constants.ts para o scripts/test-nfe-source.mjs poder alternar em tempo de execução
  if (process.env.NEXT_PUBLIC_NFE_SOURCE === "emiteai") return false;
  if (failures < FAILURES_TO_OPEN) return true;
  return Date.now() - openedAt > RETRY_AFTER_MS; // meio-aberto: tenta de novo após o cooldown
}

/**
 * SIEG enquanto responder; Emite Aí como fallback e, após falhas seguidas, como padrão.
 * `preferred: "emiteai"` (escolha do usuário) vai direto ao Emite Aí.
 */
export async function fetchNFe(
  cnpj: string,
  startDate: string,
  endDate: string,
  preferred: NfeSource = "sieg",
): Promise<NfeFetchResult> {
  let fallbackReason: string | undefined;

  if (preferred === "sieg" && siegAllowed()) {
    try {
      const docs = await fetchSiegNFe(cnpj, startDate, endDate);
      failures = 0;
      return { docs, source: "sieg" };
    } catch (err) {
      failures++;
      if (failures >= FAILURES_TO_OPEN) openedAt = Date.now();
      fallbackReason = err instanceof Error ? err.message : String(err);
    }
  }

  try {
    const docs = await fetchNFeRecebidas(cnpj, startDate, endDate);
    return { docs, source: "emiteai", fallbackReason };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(
      fallbackReason ? `${msg} (SIEG também falhou: ${fallbackReason})` : msg,
    );
  }
}
