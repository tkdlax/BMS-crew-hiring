import { SignJWT, jwtVerify, type JWTPayload } from "jose";
import type { HttpRequest } from "@azure/functions";
import bcrypt from "bcryptjs";
import { config, isProduction } from "../../config.js";

export const SESSION_COOKIE_NAME = "bms_admin_session";
const TTL = "8h";

export type SessionRole = "admin" | "office";

export type SessionPayload = {
  role: SessionRole;
  officeId?: number;
  officeSlug?: string;
};

export async function verifyAdminPassword(password: string): Promise<boolean> {
  if (!config.adminPasswordHash) {
    if (isProduction()) return false;
    return password === "admin";
  }
  return bcrypt.compare(password, config.adminPasswordHash);
}

export async function hashOfficePassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyOfficePassword(
  hash: string | null | undefined,
  password: string
): Promise<boolean> {
  if (!hash) return false;
  return bcrypt.compare(password, hash);
}

export async function createAdminSessionToken(): Promise<string> {
  return signSession({ role: "admin" });
}

export async function createOfficeSessionToken(
  officeId: number,
  officeSlug: string
): Promise<string> {
  return signSession({ role: "office", officeId, officeSlug });
}

async function signSession(payload: SessionPayload): Promise<string> {
  const secret = new TextEncoder().encode(config.sessionSigningSecret);
  return new SignJWT(payload as JWTPayload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(TTL)
    .sign(secret);
}

export async function readSession(req: HttpRequest): Promise<SessionPayload | null> {
  const token = getSessionCookie(req);
  if (!token) return null;
  try {
    const secret = new TextEncoder().encode(config.sessionSigningSecret);
    const { payload } = await jwtVerify(token, secret);
    const role = payload.role as SessionRole | undefined;
    if (role !== "admin" && role !== "office") return null;
    if (role === "office") {
      const officeId = payload.officeId as number | undefined;
      const officeSlug = payload.officeSlug as string | undefined;
      if (!officeId || !officeSlug) return null;
      return { role, officeId, officeSlug };
    }
    return { role: "admin" };
  } catch {
    return null;
  }
}

export function getSessionCookie(req: HttpRequest): string | null {
  const cookie = req.headers.get("cookie") ?? "";
  const match = cookie.match(new RegExp(`${SESSION_COOKIE_NAME}=([^;]+)`));
  return match?.[1] ?? null;
}

export function sessionCookieHeader(token: string): Record<string, string> {
  const maxAge = 8 * 60 * 60;
  return {
    "Set-Cookie": `${SESSION_COOKIE_NAME}=${token}; HttpOnly; Secure; SameSite=None; Path=/; Max-Age=${maxAge}`,
  };
}

export function clearSessionCookie(): Record<string, string> {
  return {
    "Set-Cookie": `${SESSION_COOKIE_NAME}=; HttpOnly; Secure; SameSite=None; Path=/; Max-Age=0`,
  };
}

export async function requireAdmin(req: HttpRequest): Promise<boolean> {
  const session = await readSession(req);
  return session?.role === "admin";
}

export async function requireOffice(
  req: HttpRequest
): Promise<{ officeId: number; officeSlug: string } | null> {
  const session = await readSession(req);
  if (session?.role !== "office" || !session.officeId || !session.officeSlug) return null;
  return { officeId: session.officeId, officeSlug: session.officeSlug };
}

export async function canAccessOffice(
  req: HttpRequest,
  officeId: number
): Promise<boolean> {
  const session = await readSession(req);
  if (!session) return false;
  if (session.role === "admin") return true;
  if (session.role === "office") return session.officeId === officeId;
  return false;
}

/** @deprecated Use createAdminSessionToken */
export async function createSessionToken(): Promise<string> {
  return createAdminSessionToken();
}

/** @deprecated Use readSession */
export async function verifySessionToken(token: string): Promise<boolean> {
  try {
    const secret = new TextEncoder().encode(config.sessionSigningSecret);
    const { payload } = await jwtVerify(token, secret);
    return payload.role === "admin" || payload.role === "office";
  } catch {
    return false;
  }
}
