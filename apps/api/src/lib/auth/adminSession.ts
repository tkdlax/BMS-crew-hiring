import { SignJWT, jwtVerify } from "jose";
import type { HttpRequest } from "@azure/functions";
import bcrypt from "bcryptjs";
import { config } from "../../config.js";

const COOKIE_NAME = "bms_admin_session";
const TTL = "8h";

export async function verifyAdminPassword(password: string): Promise<boolean> {
  if (!config.adminPasswordHash) return password === "admin";
  return bcrypt.compare(password, config.adminPasswordHash);
}

export async function createSessionToken(): Promise<string> {
  const secret = new TextEncoder().encode(config.sessionSigningSecret);
  return new SignJWT({ role: "admin" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(TTL)
    .sign(secret);
}

export async function verifySessionToken(
  token: string
): Promise<boolean> {
  try {
    const secret = new TextEncoder().encode(config.sessionSigningSecret);
    await jwtVerify(token, secret);
    return true;
  } catch {
    return false;
  }
}

export function getSessionCookie(req: HttpRequest): string | null {
  const cookie = req.headers.get("cookie") ?? "";
  const match = cookie.match(new RegExp(`${COOKIE_NAME}=([^;]+)`));
  return match?.[1] ?? null;
}

export function sessionCookieHeader(token: string): Record<string, string> {
  const maxAge = 8 * 60 * 60;
  return {
    "Set-Cookie": `${COOKIE_NAME}=${token}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${maxAge}`,
  };
}

export function clearSessionCookie(): Record<string, string> {
  return {
    "Set-Cookie": `${COOKIE_NAME}=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0`,
  };
}

export async function requireAdmin(req: HttpRequest): Promise<boolean> {
  const token = getSessionCookie(req);
  if (!token) return false;
  return verifySessionToken(token);
}
