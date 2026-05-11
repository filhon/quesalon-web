export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const key = searchParams.get("key");

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
