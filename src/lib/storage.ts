import "server-only";

/*
  Private video storage (Supabase Storage bucket `sunrooof-ld-videos`).

  Videos are too large to commit to git and Vercel's filesystem is ephemeral, so
  the real bytes live in a PRIVATE bucket. The /api/video route checks the lock
  first (server-side), then asks here for a short-lived signed URL and redirects
  the player to it. The bucket has no public-read policy, so the service-role key
  is the only way to read it — which is why this runs server-only and the key is
  never shipped to the client.

  Configured via env (see .env.example): SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
  and optionally SUPABASE_VIDEO_BUCKET. When unset (e.g. a fresh local clone with
  the mp4s present under media/videos), the route just streams the local file.
*/

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BUCKET = process.env.SUPABASE_VIDEO_BUCKET ?? "sunrooof-ld-videos";

export function videoStorageConfigured(): boolean {
  return Boolean(SUPABASE_URL && SERVICE_KEY);
}

/** A short-lived signed URL for a private video object, or null if unavailable. */
export async function signedVideoUrl(id: string, expiresIn = 3600): Promise<string | null> {
  if (!SUPABASE_URL || !SERVICE_KEY) return null;
  try {
    const res = await fetch(
      `${SUPABASE_URL}/storage/v1/object/sign/${BUCKET}/${encodeURIComponent(id)}.mp4`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${SERVICE_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({ expiresIn }),
        cache: "no-store",
      },
    );
    if (!res.ok) return null;
    const data = (await res.json()) as { signedURL?: string; signedUrl?: string };
    const signed = data.signedURL ?? data.signedUrl;
    return signed ? `${SUPABASE_URL}/storage/v1${signed}` : null;
  } catch {
    return null;
  }
}
