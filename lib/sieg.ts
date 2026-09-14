import { decodeLote } from "./decode.ts";
import type { NFeDoc } from "./types";

const SIEG_URL = "https://api.sieg.com/BaixarXmls";
const PAGE_SIZE = 50;
const MAX_PAGES = 100;
// curto de propósito: quando o SIEG for desligado, o usuário não pode esperar muito antes do fallback
const FETCH_TIMEOUT_MS = 15_000;

/** NF-e recebidas pelo CNPJ (destinatário) emitidas entre startDate e endDate, via SIEG. */
export async function fetchSiegNFe(
  cnpj: string,
  startDate: string,
  endDate: string,
): Promise<NFeDoc[]> {
  const apiKey = process.env.SIEG_API_KEY;
  if (!apiKey) throw new Error("SIEG_API_KEY not configured");

  const url = `${SIEG_URL}?api_key=${apiKey}`;
  const accumulated: string[] = [];

  for (let page = 0, skip = 0; page < MAX_PAGES; page++, skip += PAGE_SIZE) {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        XmlType: 1,
        Take: PAGE_SIZE,
        Skip: skip,
        DataEmissaoInicio: startDate,
        DataEmissaoFim: endDate,
        CnpjDest: cnpj,
        Downloadevent: false,
      }),
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });

    if (!res.ok) {
      throw new Error(`SIEG API error ${res.status}: ${await res.text()}`);
    }

    const raw = await res.json();
    const items: string[] = Array.isArray(raw) ? raw : JSON.parse(raw);
    if (!Array.isArray(items)) throw new Error("SIEG API: unexpected response");

    accumulated.push(...items);
    if (items.length < PAGE_SIZE) break;
  }

  return decodeLote(accumulated);
}
