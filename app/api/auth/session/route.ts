const FIREBASE_LOOKUP_URL =
  "https://identitytoolkit.googleapis.com/v1/accounts:lookup";

const SESSION_MAX_AGE = 60 * 60; // 1 hour — matches Firebase ID token lifetime

function sessionCookieHeader(value: string, maxAge: number): string {
  const isProduction = process.env.NODE_ENV === "production";
  const parts = [
    `session=${value}`,
    "Path=/",
    `Max-Age=${maxAge}`,
    "HttpOnly",
    "SameSite=Strict",
    ...(isProduction ? ["Secure"] : []),
  ];
  return parts.join("; ");
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const idToken: unknown = body?.idToken;

    if (!idToken || typeof idToken !== "string") {
      return Response.json({ error: "idToken required" }, { status: 400 });
    }

    const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
    if (!apiKey) {
      return Response.json({ error: "Server misconfigured" }, { status: 500 });
    }

    const verifyRes = await fetch(`${FIREBASE_LOOKUP_URL}?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken }),
      signal: AbortSignal.timeout(5_000),
    });

    if (!verifyRes.ok) {
      return Response.json({ error: "Invalid token" }, { status: 401 });
    }

    return new Response(null, {
      status: 204,
      headers: { "Set-Cookie": sessionCookieHeader(idToken, SESSION_MAX_AGE) },
    });
  } catch {
    return Response.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function DELETE() {
  return new Response(null, {
    status: 204,
    headers: {
      "Set-Cookie": sessionCookieHeader("", 0),
    },
  });
}
