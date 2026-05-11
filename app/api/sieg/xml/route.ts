export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const key = searchParams.get("key");
    const type = searchParams.get("type");

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
