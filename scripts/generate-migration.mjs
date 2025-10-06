#!/usr/bin/env node
import { spawn } from "node:child_process";
import { access, constants, mkdir } from "node:fs/promises";
import path from "node:path";

function formatTimestamp(date = new Date()) {
  const pad = (value) => value.toString().padStart(2, "0");
  const year = date.getUTCFullYear();
  const month = pad(date.getUTCMonth() + 1);
  const day = pad(date.getUTCDate());
  const hours = pad(date.getUTCHours());
  const minutes = pad(date.getUTCMinutes());
  return `${year}${month}${day}${hours}${minutes}`;
}

function slugify(value) {
  const base = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return base.length ? base : "update";
}

const rawArgs = process.argv.slice(2);
const separatorIndex = rawArgs.indexOf("--");
const nameParts =
  separatorIndex === -1 ? rawArgs : rawArgs.slice(0, separatorIndex);
const extraArgs =
  separatorIndex === -1 ? [] : rawArgs.slice(separatorIndex + 1);

const migrationName = nameParts.length ? nameParts.join("-") : "auto";
const slug = slugify(migrationName);
const timestamp = formatTimestamp();
const migrationsDir = path.resolve("supabase", "migrations");
await mkdir(migrationsDir, { recursive: true });
const targetFile = path.join(migrationsDir, `${timestamp}_${slug}.sql`);

const cliExecutable = path.resolve(
  "node_modules",
  ".bin",
  process.platform === "win32" ? "supabase.cmd" : "supabase"
);

try {
  await access(cliExecutable, constants.X_OK);
} catch (error) {
  console.error(
    "Supabase CLI introuvable. Vérifie que la dépendance 'supabase' est installée."
  );
  process.exit(1);
}

try {
  await access(targetFile, constants.F_OK);
  console.error(`Un fichier de migration existe déjà : ${targetFile}`);
  process.exit(1);
} catch {
  // Fine, the file does not exist yet.
}

const cliArgs = [
  "db",
  "diff",
  "--schema",
  "public",
  "--file",
  targetFile,
  "--use-migra",
  ...extraArgs,
];

console.log(
  `→ Génération de la migration : ${path.relative(process.cwd(), targetFile)}`
);
const child = spawn(cliExecutable, cliArgs, {
  stdio: "inherit",
});

child.on("close", async (code) => {
  if (code === 0) {
    console.log("✓ Migration créée avec succès.");
    process.exit(0);
  }

  try {
    await access(targetFile, constants.F_OK);
    console.warn(
      "⚠️ La commande a retourné un code d’erreur mais le fichier de migration a été généré. Vérifie son contenu."
    );
  } catch {
    console.warn(
      "⚠️ Aucune migration générée (probablement aucune différence détectée)."
    );
  }

  process.exit(code ?? 1);
});
