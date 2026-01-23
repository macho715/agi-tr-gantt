import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

function sh(cmd) {
  console.log(`$ ${cmd}`);
  execSync(cmd, { stdio: "inherit" });
}

function readJson(p) {
  return JSON.parse(fs.readFileSync(p, "utf8"));
}

function exists(p) {
  try { fs.accessSync(p, fs.constants.F_OK); return true; } catch { return false; }
}

function detectPM(cwd) {
  if (exists(path.join(cwd, "pnpm-lock.yaml"))) return "pnpm";
  if (exists(path.join(cwd, "yarn.lock"))) return "yarn";
  if (exists(path.join(cwd, "package-lock.json"))) return "npm";
  return "npm";
}

function installCmd(pm, cwd) {
  const hasPkgLock = exists(path.join(cwd, "package-lock.json"));
  if (pm === "npm" && hasPkgLock) return "npm ci";
  return `${pm} install`;
}

function runIfScript(pm, scripts, key) {
  if (!Object.prototype.hasOwnProperty.call(scripts, key)) return { ran: false, key };
  sh(`${pm} run ${key}`);
  return { ran: true, key };
}

const cwd = process.cwd();
const pkgPath = path.join(cwd, "package.json");
if (!exists(pkgPath)) {
  console.error("package.json NOT_FOUND");
  process.exit(2);
}
const pkg = readJson(pkgPath);
const scripts = pkg.scripts ?? {};
const pm = detectPM(cwd);

const report = {
  packageManager: pm,
  ran: [],
  skipped: [],
};

sh(installCmd(pm, cwd));

for (const key of ["lint", "typecheck", "tsc", "check", "test", "build"]) {
  const r = runIfScript(pm, scripts, key);
  if (r.ran) report.ran.push(key);
  else report.skipped.push(key);
}

console.log(JSON.stringify({ ok: true, report }, null, 2));
