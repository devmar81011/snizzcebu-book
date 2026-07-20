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
  return `${versionsPrefix(pathname)}v-${rev}.json`;
}

function privatePointerPath(pathname: string): string {
  return `private/${pathname}`;
}

async function readViaGet<T>(
  pathname: string,
  access: "public" | "private",
): Promise<T | null> {
  const token = blobToken();
  if (!token) return null;

  try {
    const result = await get(pathname, {
      access,
      // Private + useCache:false is required for overwrite consistency.
      // Public overwrites can stay stale for up to ~60s on the CDN.
      ...(access === "private" ? { useCache: false as const } : {}),
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
 * Prefer immutable versioned blobs (no CDN overwrite lag), then private pointer,
 * then legacy public pathname for migration.
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
      const result = await get(newest.pathname, {
        access: "private",
        useCache: false,
        token,
      });
      if (result?.statusCode === 200 && result.stream) {
        const text = await streamToText(result.stream);
        const envelope = JSON.parse(text) as Envelope<T>;
        if (envelope && "data" in envelope) return envelope.data;
      }
    }
  } catch {
    // fall through to pointer / legacy
  }

  const fromPrivate = await readViaGet<T>(privatePointerPath(pathname), "private");
  if (fromPrivate !== null) return fromPrivate;

  // Legacy public overwrite files from earlier deploys.
  return readViaGet<T>(pathname, "public");
}

/**
 * Write JSON so the next read cannot see a stale CDN overwrite.
 * Each save creates a new immutable version object + a private pointer.
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

  // Immutable version — brand-new pathname, immediately consistent.
  await put(versionPath(pathname, rev), body, {
    access: "private",
    addRandomSuffix: false,
    contentType: "application/json",
    token,
  });

  // Private pointer for fast latest lookup with consistent reads.
  await put(privatePointerPath(pathname), body, {
    access: "private",
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: "application/json",
    token,
  });
}
