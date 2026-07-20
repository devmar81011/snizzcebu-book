import { getSupabase, getSupabaseUrl } from "@/lib/supabase";

export type UploadBucket = "payment-proofs" | "payment-qr";

function extensionFromMime(mime: string, fallback: string): string {
  const raw = mime.split("/")[1]?.toLowerCase() || fallback;
  if (raw === "jpeg") return "jpg";
  if (raw === "svg+xml") return "svg";
  return raw.replace(/[^a-z0-9]/g, "") || fallback;
}

/** Upload an image to a public Supabase Storage bucket; returns the public URL. */
export async function uploadPublicImage(options: {
  bucket: UploadBucket;
  file: File | Blob;
  filenamePrefix: string;
  contentType?: string;
}): Promise<string> {
  const contentType =
    options.contentType ||
    (options.file instanceof File ? options.file.type : "") ||
    "application/octet-stream";
  const ext = extensionFromMime(contentType, "jpg");
  const path = `${options.filenamePrefix}-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 8)}.${ext}`;

  const buffer = Buffer.from(await options.file.arrayBuffer());
  const supabase = getSupabase();
  const { error } = await supabase.storage
    .from(options.bucket)
    .upload(path, buffer, {
      contentType,
      upsert: false,
      cacheControl: "3600",
    });

  if (error) {
    throw new Error(`Upload failed: ${error.message}`);
  }

  const { data } = supabase.storage.from(options.bucket).getPublicUrl(path);
  if (data?.publicUrl) return data.publicUrl;

  // Fallback if client helper is unavailable for any reason
  return `${getSupabaseUrl()}/storage/v1/object/public/${options.bucket}/${path}`;
}
