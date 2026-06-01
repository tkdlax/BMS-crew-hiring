import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { spawnSync } from "child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const settingsPath = path.join(__dirname, "..", "apps", "api", "local.settings.json");

if (!fs.existsSync(settingsPath)) {
  console.error(
    "Missing apps/api/local.settings.json — copy from local.settings.example.json"
  );
  process.exit(1);
}

const settings = JSON.parse(fs.readFileSync(settingsPath, "utf8"));
const conn = settings.Values?.SQL_CONNECTION_STRING;

if (!conn || conn.includes("localhost") || conn.includes("Your_password")) {
  console.error(
    "Set SQL_CONNECTION_STRING in apps/api/local.settings.json to your Azure SQL connection string, then run again."
  );
  process.exit(1);
}

const result = spawnSync(
  process.execPath,
  [path.join(__dirname, "run-migrations.js")],
  {
    env: { ...process.env, SQL_CONNECTION_STRING: conn },
    stdio: "inherit",
  }
);

process.exit(result.status ?? 1);
