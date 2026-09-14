import { fetchNFe } from "@/lib/nfe-source";
import { COMPANIES } from "@/lib/constants";
import {
  requireAuth,
  unauthorizedResponse,
  AuthError,
} from "@/lib/auth-server";

const ALLOWED_CNPJS = new Set(COMPANIES.map((c) => c.cnpj));
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

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
