import { put } from "@vercel/blob";
import { promises as fs } from "fs";
import path from "path";

function extensionFor(file: File, fallback: string) {
  const fromType = file.type.split("/")[1]?.replace("jpeg", "jpg");
  if (fromType) return fromType;
  const fromName = file.name.split(".").pop();
  return fromName || fallback;
}

/**
 * Upload a public image. Uses Vercel Blob when BLOB_READ_WRITE_TOKEN is set
 * (production), otherwise writes under /public for local development.
 */
export async function uploadPublicImage(
  file: File,
  options: { folder: string; prefix: string; fallbackExt?: string },
): Promise<string> {
  const ext = extensionFor(file, options.fallbackExt || "jpg");
  const filename = `${options.prefix}-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 7)}.${ext}`;

  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const blob = await put(`${options.folder}/${filename}`, file, {
      access: "public",
      token: process.env.BLOB_READ_WRITE_TOKEN,
    });
    return blob.url;
  }

  const dir = path.join(process.cwd(), "public", options.folder);
  await fs.mkdir(dir, { recursive: true });
  const buffer = Buffer.from(await file.arrayBuffer());
  await fs.writeFile(path.join(dir, filename), buffer);
  return `/${options.folder}/${filename}`;
}
