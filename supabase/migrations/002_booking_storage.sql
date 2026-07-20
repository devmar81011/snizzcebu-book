-- Public buckets for booking payment proofs and admin QR images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  (
    'payment-proofs',
    'payment-proofs',
    true,
    8388608,
    ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif', 'image/heic', 'image/heif']
  ),
  (
    'payment-qr',
    'payment-qr',
    true,
    5242880,
    ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml']
  )
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Public read payment-proofs" ON storage.objects;
DROP POLICY IF EXISTS "Public read payment-qr" ON storage.objects;
DROP POLICY IF EXISTS "Public upload payment-proofs" ON storage.objects;
DROP POLICY IF EXISTS "Public upload payment-qr" ON storage.objects;

CREATE POLICY "Public read payment-proofs"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'payment-proofs');

CREATE POLICY "Public read payment-qr"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'payment-qr');

CREATE POLICY "Public upload payment-proofs"
  ON storage.objects FOR INSERT
  TO public
  WITH CHECK (bucket_id = 'payment-proofs');

CREATE POLICY "Public upload payment-qr"
  ON storage.objects FOR INSERT
  TO public
  WITH CHECK (bucket_id = 'payment-qr');
