const FIREBASE_LOOKUP_URL =
  "https://identitytoolkit.googleapis.com/v1/accounts:lookup";

export class AuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AuthError";
  }
}

export function unauthorizedResponse(): Response {
  return Response.json({ error: "Unauthorized" }, { status: 401 });
}

/**
 * Verifies the Firebase ID token stored in the `session` cookie.
 * Throws AuthError if the cookie is missing or the token is invalid/expired.
 */
export async function requireAuth(
  request: Request,
): Promise<{ uid: string; email: string }> {
  const cookieHeader = request.headers.get("cookie") ?? "";
  const sessionPart = cookieHeader
    .split(";")
    .find((c) => c.trim().startsWith("session="));
  const session = sessionPart?.split("=").slice(1).join("=").trim();

  if (!session) throw new AuthError("No session cookie");

  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  if (!apiKey) throw new Error("Firebase API key not configured");

  const res = await fetch(`${FIREBASE_LOOKUP_URL}?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ idToken: session }),
    signal: AbortSignal.timeout(5_000),
  });

  if (!res.ok) throw new AuthError("Invalid or expired session");

  const data = await res.json();
  const user = data.users?.[0];
  if (!user) throw new AuthError("User not found");

  return { uid: user.localId as string, email: user.email as string };
}
