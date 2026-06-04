import crypto from "crypto";

export function generateCalendarFeedToken(): string {
  return crypto.randomBytes(32).toString("base64url");
}
