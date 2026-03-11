import type { Express, Request, Response } from "express";
import { createRemoteJWKSet, jwtVerify } from "jose";

const SUPABASE_URL = process.env.VITE_SUPABASE_URL ?? "";
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY ?? "";

function getAllowedEmails(): Set<string> {
  const csv = process.env.ALLOWED_EMAILS_CSV;
  if (csv) {
    return new Set(csv.split(",").map((e) => e.trim().toLowerCase()).filter(Boolean));
  }
  return new Set(["maciej.koziej01@gmail.com", "kamila.lobko286@gmail.com", "manus@ofshore.dev"]);
}

function getAdminEmails(): Set<string> {
  const csv = process.env.ADMIN_EMAILS_CSV;
  if (csv) {
    return new Set(csv.split(",").map((e) => e.trim().toLowerCase()).filter(Boolean));
  }
  return new Set(["maciej.koziej01@gmail.com", "kamila.lobko286@gmail.com", "manus@ofshore.dev"]);
}

let _jwks: ReturnType<typeof createRemoteJWKSet> | null = null;
function getJWKS() {
  if (!_jwks && SUPABASE_URL) {
    _jwks = createRemoteJWKSet(
      new URL(`${SUPABASE_URL}/auth/v1/.well-known/jwks.json`)
    );
  }
  return _jwks;
}

interface SupabaseJwtPayload {
  sub: string;
  email?: string;
  user_metadata?: { full_name?: string; name?: string };
  app_metadata?: Record<string, unknown>;
  role?: string;
  aud?: string;
}

export async function verifySupabaseToken(
  accessToken: string
): Promise<SupabaseJwtPayload | null> {
  const jwks = getJWKS();
  if (!jwks) return null;
  try {
    const { payload } = await jwtVerify(accessToken, jwks, {
      algorithms: ["ES256", "RS256"],
    });
    return payload as unknown as SupabaseJwtPayload;
  } catch (err) {
    console.warn("[SupabaseAuth] Token verification failed:", String(err));
    return null;
  }
}

export function isEmailAllowed(email: string | null | undefined): boolean {
  if (!email) return false;
  return getAllowedEmails().has(email.toLowerCase());
}

export function isEmailAdmin(email: string | null | undefined): boolean {
  if (!email) return false;
  return getAdminEmails().has(email.toLowerCase());
}

export function registerSupabaseAuthRoutes(app: Express) {
  app.get("/api/auth/supabase-config", (_req: Request, res: Response) => {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      res.status(503).json({ error: "Supabase not configured" });
      return;
    }
    res.json({
      url: SUPABASE_URL,
      anonKey: SUPABASE_ANON_KEY,
    });
  });
}
