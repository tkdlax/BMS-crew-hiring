/**
 * Build a self-contained Azure Functions package (dist + host.json + node_modules).
 * Workspaces hoist deps to the repo root; deploying apps/api alone breaks at runtime.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { execSync } from "child_process";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const apiDir = path.join(root, "apps", "api");
const sharedDir = path.join(root, "packages", "shared");
const outDir = path.join(root, "deploy_pkg");

function rm(dir) {
  if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true });
}

function cp(src, dest) {
  fs.cpSync(src, dest, { recursive: true });
}

console.log("Building @bms/shared and @bms/api...");
execSync("npm run build -w @bms/shared && npm run build -w @bms/api", {
  cwd: root,
  stdio: "inherit",
});

console.log("Assembling deploy_pkg...");
rm(outDir);
fs.mkdirSync(outDir, { recursive: true });

cp(path.join(apiDir, "host.json"), path.join(outDir, "host.json"));
cp(path.join(apiDir, "package.json"), path.join(outDir, "package.json"));
cp(path.join(apiDir, "dist"), path.join(outDir, "dist"));

const sharedTarget = path.join(outDir, "node_modules", "@bms", "shared");
fs.mkdirSync(path.dirname(sharedTarget), { recursive: true });
cp(path.join(sharedDir, "package.json"), path.join(sharedTarget, "package.json"));
cp(path.join(sharedDir, "dist"), path.join(sharedTarget, "dist"));

console.log("Installing production dependencies into deploy_pkg...");
execSync(
  "npm install --omit=dev --no-package-lock @azure/functions bcryptjs jose mssql twilio @sendgrid/mail zod",
  { cwd: outDir, stdio: "inherit" }
);

console.log("deploy_pkg ready:", outDir);
