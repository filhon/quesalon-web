import {
  requireAuth,
  unauthorizedResponse,
  AuthError,
} from "@/lib/auth-server";

const KEY_RE = /^\d{44}$/;
const VALID_TYPES = new Set(["1", "2", "3", "4", "5"]);

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
    const type = searchParams.get("type");

    if (!key || !KEY_RE.test(key)) {
      return Response.json({ error: "Invalid key" }, { status: 400 });
    }
    if (!type || !VALID_TYPES.has(type)) {
      return Response.json({ error: "Invalid type" }, { status: 400 });
    }

    const apiKey = process.env.SIEG_API_KEY;
    const email = process.env.SIEG_EMAIL;

    if (!apiKey || !email) {
      return Response.json(
        { error: "SIEG_API_KEY or SIEG_EMAIL not configured" },
        { status: 500 },
      );
    }

    const url = `https://api.sieg.com/aws/api-xml.ashx?apikey=${apiKey}&email=${encodeURIComponent(email)}&xmlkey=${key}&xmltype=${type}`;

    const res = await fetch(url);

    if (!res.ok) {
      const text = await res.text();
      return Response.json(
        { error: `SIEG API error ${res.status}: ${text}` },
        { status: 500 },
      );
    }

    const xml = await res.text();

    return new Response(xml, {
      headers: { "Content-Type": "application/xml" },
    });
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    return Response.json({ error }, { status: 500 });
  }
}
