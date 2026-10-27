// extensões explícitas para os scripts/test-*.mjs rodarem direto no Node
import { fetchSiegNFe } from "./sieg.ts";
import { fetchNFeRecebidas, fetchStatusNFe } from "./emiteai.ts";
import { SIEG_CAPTURE_END } from "./constants.ts";
import type { NFeDoc, NfeSource } from "./types";

export interface NfeFetchResult {
  docs: NFeDoc[];
  source: NfeSource;
  /** Presente quando o SIEG falhou e a busca caiu para o Emite Aí. */
  fallbackReason?: string;
  /** Notas canceladas ou denegadas na SEFAZ, retiradas de `docs`. */
  canceladas: number;
}

const FAILURES_TO_OPEN = 3;
const RETRY_AFTER_MS = 30 * 60_000;
const STATUS_INVALIDO = new Set(["CANCELADA", "DENEGADA"]);

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

const chave = (d: NFeDoc) => String(d.nfeProc.protNFe.infProt.chNFe);

/**
 * SIEG enquanto responder; Emite Aí como fallback e, após falhas seguidas, como padrão.
 * `preferred: "emiteai"` vai direto ao Emite Aí.
 * Em qualquer fonte, notas canceladas/denegadas na SEFAZ ficam de fora.
 */
export async function fetchNFe(
  cnpj: string,
  startDate: string,
  endDate: string,
  preferred: NfeSource = "sieg",
): Promise<NfeFetchResult> {
  const r = await fetchFromSource(cnpj, startDate, endDate, preferred);
  const docs = await semCanceladas(r.docs);
  return { ...r, docs, canceladas: r.docs.length - docs.length };
}

async function fetchFromSource(
  cnpj: string,
  startDate: string,
  endDate: string,
  preferred: NfeSource,
): Promise<Omit<NfeFetchResult, "canceladas">> {
  let fallbackReason: string | undefined;
  // período que passa do fim da captação do SIEG: só o Emite Aí tem as notas (não é fallback)
  const posCaptacao = endDate > SIEG_CAPTURE_END;

  if (preferred === "sieg" && !posCaptacao && siegAllowed()) {
    try {
      const docs = await fetchSiegNFe(cnpj, startDate, endDate);
      failures = 0;
      return { docs, source: "sieg" };
    } catch (err) {
      fallbackReason = err instanceof Error ? err.message : String(err);
      // rate limit não é SIEG fora do ar: não pode desviar todo mundo para o Emite Aí por 30 min
      if (!fallbackReason.startsWith("SIEG API error 429")) {
        failures++;
        if (failures >= FAILURES_TO_OPEN) openedAt = Date.now();
      }
    }
  }

  try {
    const docs = await fetchNFeRecebidas(cnpj, startDate, endDate);
    return { docs, source: "emiteai", fallbackReason };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const fim = SIEG_CAPTURE_END.split("-").reverse().join("/");
    // a mensagem vai para o operador; o detalhe técnico segue em `cause`
    throw new Error(
      posCaptacao
        ? `O Emite Aí não respondeu. Notas emitidas depois de ${fim} só existem nele: tente de novo em alguns minutos ou escolha um período até ${fim}.`
        : fallbackReason
          ? "Nem o SIEG nem o Emite Aí responderam. Tente de novo em alguns minutos."
          : "O Emite Aí não respondeu. Tente de novo em alguns minutos.",
      { cause: fallbackReason ? `${msg} | SIEG: ${fallbackReason}` : msg },
    );
  }
}

// nem o SIEG (baixado sem eventos) nem a listagem da emiteaí dizem se a nota foi cancelada
async function semCanceladas(docs: NFeDoc[]): Promise<NFeDoc[]> {
  if (!docs.length) return docs;
  try {
    const status = await fetchStatusNFe(docs.map(chave));
    return docs.filter((d) => !STATUS_INVALIDO.has(status.get(chave(d)) ?? ""));
  } catch (err) {
    // ponytail: sem o status a verificação segue com as notas como vieram (o comportamento de antes)
    console.error("status emiteaí indisponível:", err);
    return docs;
  }
}
