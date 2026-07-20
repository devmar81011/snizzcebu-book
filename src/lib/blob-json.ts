type Envelope<T> = {
  rev: number;
  updatedAt: string;
  data: T;
};

function blobToken(): string | undefined {
  return process.env.BLOB_READ_WRITE_TOKEN || undefined;
}

export function hasBlobStore(): boolean {
  return Boolean(blobToken());
}

function versionsPrefix(pathname: string): string {
  return `${pathname}.versions/`;
}

function versionPath(pathname: string, rev: number): string {
  return `${versionsPrefix(pathname)}v-${String(rev).padStart(15, "0")}.json`;
}

async function streamToText(
  stream: ReadableStream<Uint8Array>,
): Promise<string> {
  return new Response(stream).text();
}

async function loadBlob() {
  return import("@vercel/blob");
}

async function readLegacyPublic<T>(pathname: string): Promise<T | null> {
  const token = blobToken();
  if (!token) return null;
  try {
    const { get } = await loadBlob();
    const result = await get(pathname, {
      access: "public",
      token,
    });
    if (!result || result.statusCode !== 200 || !result.stream) return null;
    const text = await streamToText(result.stream);
    const parsed = JSON.parse(text) as Envelope<T> | T;
    if (
      parsed &&
      typeof parsed === "object" &&
      "data" in parsed &&
      "rev" in parsed
    ) {
      return (parsed as Envelope<T>).data;
    }
    return parsed as T;
  } catch {
    return null;
  }
}

/**
 * Read JSON for admin state (legacy Blob fallback).
 */
export async function readJsonBlob<T>(pathname: string): Promise<T | null> {
  const token = blobToken();
  if (!token) return null;

  try {
    const { list } = await loadBlob();
    const listed = await list({
      prefix: versionsPrefix(pathname),
      token,
      limit: 1000,
    });
    if (listed.blobs.length > 0) {
      const newest = [...listed.blobs].sort((a, b) =>
        a.pathname < b.pathname ? 1 : a.pathname > b.pathname ? -1 : 0,
      )[0];
      const res = await fetch(newest.url, { cache: "no-store" });
      if (res.ok) {
        const envelope = (await res.json()) as Envelope<T>;
        if (envelope && "data" in envelope) return envelope.data;
      }
    }
  } catch {
    // fall through to legacy
  }

  return readLegacyPublic<T>(pathname);
}

/**
 * Write JSON to Blob (legacy fallback when Supabase is unavailable).
 */
export async function writeJsonBlob(
  pathname: string,
  value: unknown,
): Promise<void> {
  const token = blobToken();
  if (!token) {
    throw new Error("BLOB_READ_WRITE_TOKEN is not configured");
  }

  const { put } = await loadBlob();
  const rev = Date.now();
  const envelope: Envelope<unknown> = {
    rev,
    updatedAt: new Date().toISOString(),
    data: value,
  };
  const body = JSON.stringify(envelope, null, 2);

  await put(versionPath(pathname, rev), body, {
    access: "public",
    addRandomSuffix: false,
    contentType: "application/json",
    token,
    cacheControlMaxAge: 60 * 60 * 24 * 365,
  });
}
