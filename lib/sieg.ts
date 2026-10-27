import { decodeLote } from "./decode.ts";
import type { NFeDoc } from "./types";

const SIEG_URL = "https://api.sieg.com/BaixarXmls";
const PAGE_SIZE = 50;
const MAX_PAGES = 100;
// curto de propósito: quando o SIEG for desligado, o usuário não pode esperar muito antes do fallback
const FETCH_TIMEOUT_MS = 15_000;
// o SIEG limita a ~10 chamadas/min por chave (compartilhada por todos os usuários). O Retry-After
// (até ~58 s) é pessimista: uma vaga abre em poucos segundos, então backoff de 2+4+8 s
const RETRY_DELAYS_429_MS = [2_000, 4_000, 8_000];
// o SIEG recusa (400) intervalos de emissão acima de 2 meses
const SLICE_DAYS = 60;
const DAY_MS = 864e5;
const isoDay = (ms: number) => new Date(ms).toISOString().slice(0, 10);

/** NF-e recebidas pelo CNPJ (destinatário) emitidas entre startDate e endDate, via SIEG. */
export async function fetchSiegNFe(
  cnpj: string,
  startDate: string,
  endDate: string,
): Promise<NFeDoc[]> {
  return decodeLote(await fetchSiegXmls(cnpj, startDate, endDate));
}

/** Mesma busca, mas devolve o procNFe bruto (XML em base64), como o SIEG entrega. */
export async function fetchSiegXmls(
  cnpj: string,
  startDate: string,
  endDate: string,
): Promise<string[]> {
  const apiKey = process.env.SIEG_API_KEY;
  if (!apiKey) throw new Error("SIEG_API_KEY not configured");

  const url = `${SIEG_URL}?api_key=${apiKey}`;
  const accumulated: string[] = [];
  const last = Date.parse(endDate);

  // ponytail: fatias e páginas em série por causa do rate limit; um ano inteiro pode encostar
  // nos 60 s da Vercel. Se virar problema, limitar o período na UI.
  for (
    let ini = Date.parse(startDate);
    ini <= last;
    ini += SLICE_DAYS * DAY_MS
  ) {
    const sliceStart = isoDay(ini);
    const sliceEnd = isoDay(Math.min(ini + (SLICE_DAYS - 1) * DAY_MS, last));

    for (let page = 0, skip = 0; page < MAX_PAGES; page++, skip += PAGE_SIZE) {
      let res: Response;
      for (let attempt = 0; ; attempt++) {
        res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            XmlType: 1,
            Take: PAGE_SIZE,
            Skip: skip,
            DataEmissaoInicio: sliceStart,
            DataEmissaoFim: sliceEnd,
            CnpjDest: cnpj,
            Downloadevent: false,
          }),
          signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
        });
        if (res.status !== 429 || attempt === RETRY_DELAYS_429_MS.length) break;
        await new Promise((r) => setTimeout(r, RETRY_DELAYS_429_MS[attempt]));
      }

      if (res.status === 404) {
        // período (ou página) sem notas vem como 404, não como lista vazia
        const text = await res.text();
        if (text.includes("Nenhum arquivo XML localizado")) break;
        throw new Error(`SIEG API error 404: ${text}`);
      }
      if (!res.ok) {
        throw new Error(`SIEG API error ${res.status}: ${await res.text()}`);
      }

      const raw = await res.json();
      const items: string[] = Array.isArray(raw) ? raw : JSON.parse(raw);
      if (!Array.isArray(items))
        throw new Error("SIEG API: unexpected response");

      accumulated.push(...items);
      if (items.length < PAGE_SIZE) break;
    }
  }

  return accumulated;
}
