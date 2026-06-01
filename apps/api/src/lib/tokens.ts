import crypto from "crypto";

export function generateScheduleToken(): string {
  return crypto.randomBytes(32).toString("base64url");
}
