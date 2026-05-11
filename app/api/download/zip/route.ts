import JSZip from "jszip";

const BATCH_SIZE = 10;

export async function POST(request: Request) {
  try {
    const { keys, type } = (await request.json()) as {
      keys: string[];
      type: "xml" | "danfe";
    };

    const origin = new URL(request.url).origin;
    const zip = new JSZip();

    for (let i = 0; i < keys.length; i += BATCH_SIZE) {
      const batch = keys.slice(i, i + BATCH_SIZE);

      const results = await Promise.all(
        batch.map(async (key) => {
          if (type === "xml") {
            const res = await fetch(`${origin}/api/sieg/xml?key=${key}&type=1`);
            if (!res.ok) return null;
            const content = await res.text();
            return { key, content: Buffer.from(content, "utf-8"), ext: "xml" };
          } else {
            const res = await fetch(`${origin}/api/sieg/danfe?key=${key}`);
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
