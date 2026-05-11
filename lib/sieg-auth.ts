const JWT_ENDPOINT = "https://api.sieg.com/api/v1/create-jwt";
const JWT_TTL_MS = 23 * 60 * 60 * 1000; // 23h (token válido por 24h)

let _token: string | null = null;
let _expiresAt = 0;

export async function getSiegJwt(): Promise<string> {
  if (_token && Date.now() < _expiresAt) return _token;

  const clientId = process.env.SIEG_CLIENT_ID;
  const secretKey = process.env.SIEG_SECRET_KEY;

  if (!clientId || !secretKey) {
    throw new Error("SIEG_CLIENT_ID or SIEG_SECRET_KEY not configured");
  }

  const res = await fetch(JWT_ENDPOINT, {
    method: "POST",
    headers: { "X-Client-Id": clientId, "X-Secret-Key": secretKey },
  });

  if (!res.ok) {
    throw new Error(`SIEG JWT error ${res.status}: ${await res.text()}`);
  }

  const { token } = await res.json();
  _token = token;
  _expiresAt = Date.now() + JWT_TTL_MS;
  return token;
}

export function siegHeaders(jwt: string): Record<string, string> {
  const apiKey = process.env.SIEG_SECRET_KEY;
  if (!apiKey) throw new Error("SIEG_SECRET_KEY not configured");
  return {
    Authorization: `Bearer ${jwt}`,
    "X-API-Key": apiKey,
    "Content-Type": "application/json",
  };
}
