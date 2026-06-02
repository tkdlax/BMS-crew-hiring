#!/usr/bin/env node
/**
 * Generate a bcrypt hash for ADMIN_PASSWORD_HASH (Azure Function App setting).
 *
 * Usage:
 *   node scripts/hash-admin-password.mjs
 *   node scripts/hash-admin-password.mjs "MyNewSecurePassword"
 */
import bcrypt from "bcryptjs";

const password = process.argv[2];
if (!password) {
  console.error("Usage: node scripts/hash-admin-password.mjs \"YourNewPassword\"");
  process.exit(1);
}

const hash = await bcrypt.hash(password, 10);
console.log("\nAdd this to Azure Function App → Configuration → ADMIN_PASSWORD_HASH:\n");
console.log(hash);
console.log("\nSign in to /hiring/admin/ with the plaintext password you just entered (not this hash).\n");
