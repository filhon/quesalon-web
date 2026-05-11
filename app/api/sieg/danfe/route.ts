import {
  requireAuth,
  unauthorizedResponse,
  AuthError,
} from "@/lib/auth-server";

const KEY_RE = /^\d{44}$/;

export async function GET(request: Request) {
  try {
    await requireAuth(request);
  } catch (err) {
    if (err instanceof AuthError) return unauthorizedResponse();
    return Response.json({ error: "Auth error" }, { status: 500 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const key = searchParams.get("key");

    if (!key || !KEY_RE.test(key)) {
      return Response.json({ error: "Invalid key" }, { status: 400 });
    }

    const apiKey = process.env.SIEG_API_KEY;

    if (!apiKey) {
      return Response.json(
        { error: "SIEG_API_KEY not configured" },
        { status: 500 },
      );
    }

    const url = `https://api.sieg.com/api/Arquivos/GerarDanfeViaChave?xmlKey=${key}&api_key=${apiKey}`;

    const res = await fetch(url);

    if (!res.ok) {
      const text = await res.text();
      return Response.json(
        { error: `SIEG API error ${res.status}: ${text}` },
        { status: 500 },
      );
    }

    const base64 = await res.json();
    const pdf = Buffer.from(base64, "base64");

    return new Response(pdf, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${key}.pdf"`,
      },
    });
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    return Response.json({ error }, { status: 500 });
  }
}
