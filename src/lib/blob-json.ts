import { get, put } from "@vercel/blob";

function blobToken(): string | undefined {
  return process.env.BLOB_READ_WRITE_TOKEN || undefined;
}

export function hasBlobStore(): boolean {
  return Boolean(blobToken());
}

async function streamToText(
  stream: ReadableStream<Uint8Array>,
): Promise<string> {
  return new Response(stream).text();
}

/** Read JSON from a fixed Blob pathname. Returns null if missing. */
export async function readJsonBlob<T>(pathname: string): Promise<T | null> {
  const token = blobToken();
  if (!token) return null;

  try {
    const result = await get(pathname, {
      access: "public",
      useCache: false,
      token,
    });
    if (!result || result.statusCode !== 200 || !result.stream) return null;
    const text = await streamToText(result.stream);
    return JSON.parse(text) as T;
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
    // Admin JSON must not sit behind a long CDN TTL — stale reads cause
    // multi-click "save" / "block date" bugs across serverless instances.
    cacheControlMaxAge: 0,
  });
}
