import { promises as fs } from "fs";
import path from "path";
import {
  uploadPublicImage as uploadToSupabase,
  type UploadBucket,
} from "@/lib/storage";
import { hasSupabaseStore } from "@/lib/supabase";

function extensionFor(file: File, fallback: string) {
  const fromType = file.type.split("/")[1]?.replace("jpeg", "jpg");
  if (fromType) return fromType;
  const fromName = file.name.split(".").pop();
  return fromName || fallback;
}

function bucketForFolder(folder: string): UploadBucket {
  if (folder === "payments" || folder.includes("qr")) return "payment-qr";
  return "payment-proofs";
}

/**
 * Upload a public image. Prefers Supabase Storage, then Vercel Blob,
 * otherwise writes under /public for local development.
 */
export async function uploadPublicImage(
  file: File,
  options: { folder: string; prefix: string; fallbackExt?: string },
): Promise<string> {
  if (hasSupabaseStore()) {
    return uploadToSupabase({
      bucket: bucketForFolder(options.folder),
      file,
      filenamePrefix: `${options.folder.replace(/\//g, "-")}-${options.prefix}`,
      contentType: file.type || undefined,
    });
  }

  const ext = extensionFor(file, options.fallbackExt || "jpg");
  const filename = `${options.prefix}-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 7)}.${ext}`;

  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const { put } = await import("@vercel/blob");
    const blob = await put(`${options.folder}/${filename}`, file, {
      access: "public",
      token: process.env.BLOB_READ_WRITE_TOKEN,
      addRandomSuffix: false,
    });
    return blob.url;
  }

  if (process.env.VERCEL) {
    throw new Error(
      "Configure NEXT_PUBLIC_SUPABASE_URL (or BLOB_READ_WRITE_TOKEN) for uploads on Vercel",
    );
  }

  const dir = path.join(process.cwd(), "public", options.folder);
  await fs.mkdir(dir, { recursive: true });
  const buffer = Buffer.from(await file.arrayBuffer());
  await fs.writeFile(path.join(dir, filename), buffer);
  return `/${options.folder}/${filename}`;
}
