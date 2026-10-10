import { spawnSync } from "node:child_process";
import { copyFileSync } from "node:fs";
copyFileSync("LICENSE", "dist/LICENSE.txt");
const files = [
  ".gitignore",
  "LICENSE",
  "README.md",
  "README-academic.md",
  "package.json",
  "pnpm-lock.yaml",
  "pnpm-workspace.yaml",
  "tsconfig.json",
  "vite.config.ts",
  "index.html",
  "src",
  "tests",
  "scripts",
  "desktop",
  "capacitor.config.ts",
  "electron-builder.yml",
  ".github",
  "android",
  "public/logo.svg",
  "public/icons",
  "public/fonts",
  "public/manifest.webmanifest",
  "public/licencias.txt",
  "public/third-party",
];
const excludes = [
  "android/.gradle",
  "android/build",
  "android/app/build",
  "android/local.properties",
  "android/app/src/main/assets/public",
  "android/capacitor-cordova-android-plugins",
].map((path) => "--exclude=" + path);
const result = spawnSync(
  process.platform === "win32" ? "tar.exe" : "tar",
  ["-czf", "dist/prisma-pdf-source.tar.gz", ...excludes, ...files],
  { stdio: "inherit" },
);
if (result.status !== 0)
  throw new Error("No se pudo empaquetar el código fuente.");
