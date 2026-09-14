import { fetchNFe } from "@/lib/nfe-source";
import { COMPANIES } from "@/lib/constants";
import {
  requireAuth,
  unauthorizedResponse,
  AuthError,
} from "@/lib/auth-server";

const ALLOWED_CNPJS = new Set(COMPANIES.map((c) => c.cnpj));
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
// limita o fan-out paralelo do emiteai.ts (1 chamada upstream por fatia de 28 dias)
const MAX_RANGE_DAYS = 366;

export async function POST(request: Request) {
  try {
    await requireAuth(request);
  } catch (err) {
    if (err instanceof AuthError) return unauthorizedResponse();
    return Response.json({ error: "Auth error" }, { status: 500 });
  }

  try {
    const { cnpj, startDate, endDate, preferred } = await request.json();

    if (!cnpj || !ALLOWED_CNPJS.has(cnpj)) {
      return Response.json({ error: "Invalid CNPJ" }, { status: 400 });
    }
    if (!DATE_RE.test(startDate) || !DATE_RE.test(endDate)) {
      return Response.json(
        { error: "Invalid date format (YYYY-MM-DD)" },
        { status: 400 },
      );
    }
    const rangeDays = (Date.parse(endDate) - Date.parse(startDate)) / 864e5;
    if (!(rangeDays >= 0 && rangeDays <= MAX_RANGE_DAYS)) {
      return Response.json(
        { error: `Invalid date range (max ${MAX_RANGE_DAYS} days)` },
        { status: 400 },
      );
    }

    const { docs, source, fallbackReason } = await fetchNFe(
      cnpj,
      startDate,
      endDate,
      preferred === "emiteai" ? "emiteai" : "sieg",
    );
    return Response.json({ docs, total: docs.length, source, fallbackReason });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return Response.json({ error: message }, { status: 500 });
  }
}
