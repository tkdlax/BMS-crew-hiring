import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import sql from "mssql";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const conn =
  process.env.SQL_CONNECTION_STRING ||
  process.argv[2];

if (!conn) {
  console.error("Usage: SQL_CONNECTION_STRING=... node scripts/run-migrations.js");
  process.exit(1);
}

const migrationsDir = path.join(__dirname, "..", "db", "migrations");
const files = fs
  .readdirSync(migrationsDir)
  .filter((f) => f.endsWith(".sql"))
  .sort();

function splitBatches(sqlText) {
  const parts = sqlText.split(/\r?\n\s*GO\s*\r?\n/i).map((s) => s.trim());
  return parts.filter(Boolean);
}

const pool = await sql.connect(conn);
for (const file of files) {
  const sqlText = fs.readFileSync(path.join(migrationsDir, file), "utf8");
  const batches = splitBatches(sqlText);
  console.log(`Running ${file}...`);
  for (const batch of batches) {
    await pool.request().query(batch);
  }
  console.log(`  OK`);
}
await pool.close();
console.log("Migrations complete.");
