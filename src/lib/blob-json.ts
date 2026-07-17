import { head, put } from "@vercel/blob";

function blobToken(): string | undefined {
  return process.env.BLOB_READ_WRITE_TOKEN || undefined;
}

export function hasBlobStore(): boolean {
  return Boolean(blobToken());
}

/** Read JSON from a fixed Blob pathname. Returns null if missing. */
export async function readJsonBlob<T>(pathname: string): Promise<T | null> {
  const token = blobToken();
  if (!token) return null;

  try {
    const meta = await head(pathname, { token });
    const url = new URL(meta.url);
    // Bust CDN cache after overwrites (Blob may serve stale content briefly).
    url.searchParams.set("cache", "0");
    url.searchParams.set("t", String(Date.now()));
    const res = await fetch(url.toString(), { cache: "no-store" });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    // Missing blob or store errors → treat as empty
    return null;
  }
}

/** Write JSON to a fixed Blob pathname (overwrite). */
export async function writeJsonBlob(
  pathname: string,
  value: unknown,
): Promise<void> {
  const token = blobToken();
  if (!token) {
    throw new Error("BLOB_READ_WRITE_TOKEN is not configured");
  }

  await put(pathname, JSON.stringify(value, null, 2), {
    access: "public",
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: "application/json",
    token,
    cacheControlMaxAge: 60,
  });
}
