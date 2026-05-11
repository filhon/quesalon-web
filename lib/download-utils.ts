export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export async function fetchAndDownload(
  url: string,
  method: "GET" | "POST",
  body: unknown,
  filename: string,
): Promise<void> {
  const res = await fetch(url, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "Erro desconhecido");
    throw new Error(text);
  }
  const blob = await res.blob();
  downloadBlob(blob, filename);
}
