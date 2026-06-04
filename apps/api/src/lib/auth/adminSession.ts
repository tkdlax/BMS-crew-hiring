/** Re-exports for backward compatibility. */
export {
  verifyAdminPassword,
  createSessionToken,
  createAdminSessionToken,
  requireAdmin,
  verifySessionToken,
  getSessionCookie,
  sessionCookieHeader,
  clearSessionCookie,
  SESSION_COOKIE_NAME,
} from "./session.js";
