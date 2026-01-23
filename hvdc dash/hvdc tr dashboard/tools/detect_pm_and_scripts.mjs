import fs from "node:fs";
import path from "node:path";

function exists(p) {
  try { fs.accessSync(p, fs.constants.F_OK); return true; } catch { return false; }
}

function readJson(p) {
  const raw = fs.readFileSync(p, "utf8");
  return JSON.parse(raw);
}

function detectPackageManager(cwd) {
  const pnpm = exists(path.join(cwd, "pnpm-lock.yaml"));
  const yarn = exists(path.join(cwd, "yarn.lock"));
  const npm = exists(path.join(cwd, "package-lock.json"));
  if (pnpm) return { pm: "pnpm", evidence: "pnpm-lock.yaml" };
  if (yarn) return { pm: "yarn", evidence: "yarn.lock" };
  if (npm) return { pm: "npm", evidence: "package-lock.json" };
  return { pm: "npm", evidence: "NO_LOCKFILE (assumption: minimal compatibility)" };
}

function confirmCommands(pm, scripts, hasPackageLock) {
  const out = {};
  const run = (k) => `${pm} run ${k}`;
  const install = () => {
    if (pm === "npm" && hasPackageLock) return "npm ci";
    return `${pm} install`;
  };

  out.install = install();

  const keys = ["dev", "build", "start", "lint", "test", "format", "fmt", "typecheck", "tsc", "check"];
  for (const k of keys) {
    if (scripts && Object.prototype.hasOwnProperty.call(scripts, k)) {
      out[k] = run(k);
    }
  }
  return out;
}

const cwd = process.cwd();
const pkgPath = path.join(cwd, "package.json");
if (!exists(pkgPath)) {
  console.log(JSON.stringify({ ok: false, error: "package.json NOT_FOUND" }, null, 2));
  process.exit(2);
}

const pkg = readJson(pkgPath);
const scripts = pkg.scripts ?? {};
const pmInfo = detectPackageManager(cwd);
const hasPackageLock = exists(path.join(cwd, "package-lock.json"));
const confirmed = confirmCommands(pmInfo.pm, scripts, hasPackageLock);

console.log(JSON.stringify({
  ok: true,
  packageManager: pmInfo.pm,
  evidence: pmInfo.evidence,
  scripts,
  confirmedCommands: confirmed,
}, null, 2));
