import { decodeLote } from "@/lib/decode";
import { COMPANIES } from "@/lib/constants";
import {
  requireAuth,
  unauthorizedResponse,
  AuthError,
} from "@/lib/auth-server";

const SIEG_URL = "https://api.sieg.com/BaixarXmls";
const PAGE_SIZE = 50;
const MAX_PAGES = 100;
const FETCH_TIMEOUT_MS = 30_000;

const ALLOWED_CNPJS = new Set(COMPANIES.map((c) => c.cnpj));
const VALID_XML_TYPES = new Set([1, 2, 3, 4, 5]);
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export async function POST(request: Request) {
  try {
    await requireAuth(request);
  } catch (err) {
    if (err instanceof AuthError) return unauthorizedResponse();
    return Response.json({ error: "Auth error" }, { status: 500 });
  }

  try {
    const { cnpj, startDate, endDate, xmlType } = await request.json();

    if (!cnpj || !ALLOWED_CNPJS.has(cnpj)) {
      return Response.json({ error: "Invalid CNPJ" }, { status: 400 });
    }
    if (!DATE_RE.test(startDate) || !DATE_RE.test(endDate)) {
      return Response.json(
        { error: "Invalid date format (YYYY-MM-DD)" },
        { status: 400 },
      );
    }
    const xmlTypeNum = xmlType ?? 1;
    if (!VALID_XML_TYPES.has(Number(xmlTypeNum))) {
      return Response.json({ error: "Invalid xmlType" }, { status: 400 });
    }

    const apiKey = process.env.SIEG_API_KEY;
    if (!apiKey) {
      return Response.json(
        { error: "SIEG_API_KEY not configured" },
        { status: 500 },
      );
    }

    const url = `${SIEG_URL}?api_key=${apiKey}`;
    const accumulated: string[] = [];
    let skip = 0;
    let pages = 0;

    while (pages < MAX_PAGES) {
      const payload = {
        XmlType: xmlTypeNum,
        Take: PAGE_SIZE,
        Skip: skip,
        DataEmissaoInicio: startDate,
        DataEmissaoFim: endDate,
        CnpjDest: cnpj,
        Downloadevent: false,
      };

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      });

      if (!res.ok) {
        const text = await res.text();
        return Response.json(
          { error: `SIEG API error ${res.status}: ${text}` },
          { status: 500 },
        );
      }

      const raw = await res.json();
      const page: string[] = Array.isArray(raw)
        ? raw
        : Array.isArray(JSON.parse(raw))
          ? JSON.parse(raw)
          : [];

      if (page.length === 0) break;

      accumulated.push(...page);
      pages++;

      if (page.length < PAGE_SIZE) break;

      skip += PAGE_SIZE;
    }

    const docs = decodeLote(accumulated);
    return Response.json({ docs, total: docs.length });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return Response.json({ error: message }, { status: 500 });
  }
}
