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

const pool = await sql.connect(conn);
for (const file of files) {
  const sqlText = fs.readFileSync(path.join(migrationsDir, file), "utf8");
  console.log(`Running ${file}...`);
  await pool.request().query(sqlText);
  console.log(`  OK`);
}
await pool.close();
console.log("Migrations complete.");
