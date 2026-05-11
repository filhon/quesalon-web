import { decodeLote } from "@/lib/decode";

const SIEG_URL = "https://api.sieg.com/BaixarXmls";
const PAGE_SIZE = 50;
const FETCH_TIMEOUT_MS = 30_000;

export async function POST(request: Request) {
  try {
    const { cnpj, startDate, endDate, xmlType } = await request.json();

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

    while (true) {
      const payload = {
        XmlType: xmlType ?? 1,
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

      const page: string[] = await res.json();

      if (!Array.isArray(page) || page.length === 0) break;

      accumulated.push(...page);
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
