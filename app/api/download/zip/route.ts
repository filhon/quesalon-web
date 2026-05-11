import JSZip from "jszip";
import {
  requireAuth,
  unauthorizedResponse,
  AuthError,
} from "@/lib/auth-server";

const BATCH_SIZE = 10;
const MAX_KEYS = 500;
const KEY_RE = /^\d{44}$/;

export async function POST(request: Request) {
  try {
    await requireAuth(request);
  } catch (err) {
    if (err instanceof AuthError) return unauthorizedResponse();
    return Response.json({ error: "Auth error" }, { status: 500 });
  }

  try {
    const body = await request.json();
    const { keys, type } = body as { keys: unknown; type: unknown };

    if (!Array.isArray(keys) || keys.length === 0 || keys.length > MAX_KEYS) {
      return Response.json(
        {
          error: `keys must be a non-empty array of at most ${MAX_KEYS} items`,
        },
        { status: 400 },
      );
    }
    if (type !== "xml" && type !== "danfe") {
      return Response.json(
        { error: "type must be 'xml' or 'danfe'" },
        { status: 400 },
      );
    }
    for (const key of keys) {
      if (typeof key !== "string" || !KEY_RE.test(key)) {
        return Response.json(
          { error: "Invalid key format (44 digits required)" },
          { status: 400 },
        );
      }
    }

    const origin = new URL(request.url).origin;
    const zip = new JSZip();

    for (let i = 0; i < keys.length; i += BATCH_SIZE) {
      const batch = (keys as string[]).slice(i, i + BATCH_SIZE);

      const results = await Promise.all(
        batch.map(async (key) => {
          const cookie = request.headers.get("cookie") ?? "";
          if (type === "xml") {
            const res = await fetch(
              `${origin}/api/sieg/xml?key=${key}&type=1`,
              {
                headers: { cookie },
              },
            );
            if (!res.ok) return null;
            const content = await res.text();
            return { key, content: Buffer.from(content, "utf-8"), ext: "xml" };
          } else {
            const res = await fetch(`${origin}/api/sieg/danfe?key=${key}`, {
              headers: { cookie },
            });
            if (!res.ok) return null;
            const content = await res.arrayBuffer();
            return { key, content: Buffer.from(content), ext: "pdf" };
          }
        }),
      );

      for (const entry of results) {
        if (!entry) continue;
        zip.file(`${entry.key}.${entry.ext}`, entry.content);
      }
    }

    const zipBuffer = await zip.generateAsync({ type: "nodebuffer" });
    const timestamp = Date.now();

    return new Response(new Uint8Array(zipBuffer), {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="quesalon_${timestamp}.zip"`,
      },
    });
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    return Response.json({ error }, { status: 500 });
  }
}
