import { get, list, put } from "@vercel/blob";

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

type Envelope<T> = {
  rev: number;
  updatedAt: string;
  data: T;
};

function versionsPrefix(pathname: string): string {
  return `${pathname}.versions/`;
}

function versionPath(pathname: string, rev: number): string {
  // Zero-pad so lexicographic sort matches numeric rev order.
  return `${versionsPrefix(pathname)}v-${String(rev).padStart(15, "0")}.json`;
}

async function readLegacyPublic<T>(pathname: string): Promise<T | null> {
  const token = blobToken();
  if (!token) return null;
  try {
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
 * Read JSON for admin state.
 *
 * Prefer immutable versioned blobs (fresh pathname every write = no CDN
 * overwrite lag). Fall back to the legacy single public pathname.
 */
export async function readJsonBlob<T>(pathname: string): Promise<T | null> {
  const token = blobToken();
  if (!token) return null;

  try {
    const listed = await list({
      prefix: versionsPrefix(pathname),
      token,
      limit: 1000,
    });
    if (listed.blobs.length > 0) {
      const newest = [...listed.blobs].sort((a, b) =>
        a.pathname < b.pathname ? 1 : a.pathname > b.pathname ? -1 : 0,
      )[0];
      // Unique versioned URLs are immediately consistent after put().
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
 * Write JSON without relying on overwrite of a single public pathname.
 * Overwriting public blobs can stay stale on the CDN for ~60s and made
 * package edits appear to save, then snap back.
 */
export async function writeJsonBlob(
  pathname: string,
  value: unknown,
): Promise<void> {
  const token = blobToken();
  if (!token) {
    throw new Error("BLOB_READ_WRITE_TOKEN is not configured");
  }

  const rev = Date.now();
  const envelope: Envelope<unknown> = {
    rev,
    updatedAt: new Date().toISOString(),
    data: value,
  };
  const body = JSON.stringify(envelope, null, 2);

  // Brand-new pathname → immediately readable, no overwrite cache lag.
  await put(versionPath(pathname, rev), body, {
    access: "public",
    addRandomSuffix: false,
    contentType: "application/json",
    token,
    cacheControlMaxAge: 60 * 60 * 24 * 365,
  });
}
