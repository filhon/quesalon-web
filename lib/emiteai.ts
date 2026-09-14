import { request } from "node:https";
import type { NFeDoc } from "./types";

const HOST = process.env.EMITEAI_HOST ?? "api.emiteai.com.br";
const SLICE_DAYS = 28; // a API recusa janelas maiores que 1 mês calendário
const RECEIPT_LAG_DAYS = 7; // observado: a nota entra até ~1,5 dia após a emissão
const TIMEOUT_MS = 45_000; // cada consulta leva ~15s, mesmo sem resultados

type InfNFe = NFeDoc["nfeProc"]["NFe"]["infNFe"];

interface DocumentoRecebido {
  chaveAcesso: string;
  documentType: "NFE" | "CTE";
  createdAt: string;
  payload: InfNFe;
}

const DAY_MS = 864e5;
const isoDay = (d: Date) => d.toISOString().slice(0, 10);

// GET com body JSON: o fetch (undici) recusa body em GET, então vai por node:https
function getDocumentosRecebidos(
  inicio: string,
  fim: string,
): Promise<DocumentoRecebido[]> {
  const token = process.env.EMITEAI_TOKEN;
  if (!token) throw new Error("EMITEAI_TOKEN not configured");

  const body = JSON.stringify({
    dataRecebimentoInicio: inicio,
    dataRecebimentoFim: fim,
  });

  return new Promise((resolve, reject) => {
    const req = request(
      {
        host: HOST,
        path: "/documento-recebido",
        method: "GET",
        timeout: TIMEOUT_MS,
        headers: {
          "x-token": token,
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(body),
        },
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on("data", (c: Buffer) => chunks.push(c));
        res.on("end", () => {
          const text = Buffer.concat(chunks).toString("utf-8");
          if (res.statusCode !== 200) {
            reject(new Error(`emiteaí API error ${res.statusCode}: ${text}`));
            return;
          }
          resolve(JSON.parse(text));
        });
      },
    );
    req.on("timeout", () => req.destroy(new Error("emiteaí API timeout")));
    req.on("error", reject);
    req.end(body);
  });
}

/** Fatias contíguas de até SLICE_DAYS dias cobrindo startDate..endDate (YYYY-MM-DD). */
export function sliceRange(
  startDate: string,
  endDate: string,
): Array<[string, string]> {
  const slices: Array<[string, string]> = [];
  let ini = new Date(`${startDate}T00:00:00Z`);
  const end = new Date(`${endDate}T00:00:00Z`);
  while (ini <= end) {
    const last = new Date(
      Math.min(ini.getTime() + (SLICE_DAYS - 1) * DAY_MS, end.getTime()),
    );
    // fim = meia-noite do dia seguinte, para não perder registros em 23:59:59.xxx
    const next = new Date(last.getTime() + DAY_MS);
    slices.push([`${isoDay(ini)}T00:00:00`, `${isoDay(next)}T00:00:00`]);
    ini = next;
  }
  return slices;
}

/**
 * NF-e recebidas pelo CNPJ (destinatário) emitidas entre startDate e endDate,
 * no mesmo formato NFeDoc que verify.ts e o relatório já consomem.
 */
export async function fetchNFeRecebidas(
  cnpj: string,
  startDate: string,
  endDate: string,
): Promise<NFeDoc[]> {
  // o filtro da API é por data de RECEBIMENTO; a nota chega depois de emitida,
  // então a busca vai além de endDate e o corte por emissão é feito aqui
  const fimBusca = isoDay(
    new Date(
      Math.min(
        new Date(`${endDate}T00:00:00Z`).getTime() + RECEIPT_LAG_DAYS * DAY_MS,
        Date.now(),
      ),
    ),
  );

  // ponytail: fatias em paralelo sem limite; se o período usual passar de ~6 meses, limitar concorrência
  const pages = await Promise.all(
    sliceRange(startDate, fimBusca).map(([ini, fim]) =>
      getDocumentosRecebidos(ini, fim),
    ),
  );

  const seen = new Set<string>();
  const docs: NFeDoc[] = [];
  for (const d of pages.flat()) {
    if (d.documentType !== "NFE" || seen.has(d.chaveAcesso)) continue;
    const inf = d.payload;
    if (String(inf?.dest?.CNPJ) !== cnpj) continue;
    const emitida = String(inf?.ide?.dhEmi ?? "").slice(0, 10);
    if (emitida < startDate || emitida > endDate) continue;
    seen.add(d.chaveAcesso);
    docs.push({
      nfeProc: {
        NFe: { infNFe: inf },
        protNFe: { infProt: { chNFe: d.chaveAcesso } },
      },
    });
  }
  return docs;
}
