#!/usr/bin/env node
/**
 * 把 TownPass repo 的 docs/townpass/ 同步到本 repo 的 docs/。
 *
 * 唯一來源是 TownPass 的 docs/townpass/：文件一律在那邊改，這裡的 docs/ 只是複本，不要直接改。
 *
 *   npm run docs:sync    複製新增和修改的檔案，刪掉來源已經沒有的檔案
 *   npm run docs:check   只檢查，兩邊不一致時列出差異並以 exit code 1 結束
 *
 * TownPass 預設在 ../TownPass；放在別的位置時設定環境變數 TOWNPASS_DIR。
 *
 * 不同步的檔案（兩邊各自保留）：
 * - *.pdf：提案簡報與規劃書只放在本 repo
 * - diagrams/build_diagrams.py：產生 SVG 的程式只放在 TownPass，這裡只放產出的 SVG
 */

import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const townpass = resolve(process.env.TOWNPASS_DIR ?? join(repoRoot, "..", "TownPass"));
const source = join(townpass, "docs", "townpass");
const target = join(repoRoot, "docs");
const checkOnly = process.argv.includes("--check");

function ignored(path) {
  const name = path.split(sep).pop();
  return (
    name === ".DS_Store" ||
    path.toLowerCase().endsWith(".pdf") ||
    path.split(sep).includes("__pycache__") ||
    path === join("diagrams", "build_diagrams.py")
  );
}

/** 列出資料夾裡所有要同步的檔案（相對路徑） */
function listFiles(root) {
  if (!existsSync(root)) return [];
  const out = [];
  const walk = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else {
        const rel = relative(root, full);
        if (!ignored(rel)) out.push(rel);
      }
    }
  };
  walk(root);
  return out.sort();
}

if (!existsSync(source)) {
  console.error(`找不到 TownPass 的文件資料夾：${source}`);
  console.error("請把 TownPass clone 到 ../TownPass，或設定環境變數 TOWNPASS_DIR。");
  process.exit(2);
}

const sourceFiles = listFiles(source);
const targetFiles = new Set(listFiles(target));

const added = sourceFiles.filter((f) => !targetFiles.has(f));
const changed = sourceFiles.filter(
  (f) => targetFiles.has(f) && !readFileSync(join(source, f)).equals(readFileSync(join(target, f))),
);
const removed = [...targetFiles].filter((f) => !sourceFiles.includes(f));

if (added.length + changed.length + removed.length === 0) {
  console.log(`docs/ 和 TownPass docs/townpass/ 一致（${sourceFiles.length} 個檔案）。`);
  process.exit(0);
}

for (const f of added) console.log(`新增  ${f}`);
for (const f of changed) console.log(`修改  ${f}`);
for (const f of removed) console.log(`刪除  ${f}`);

if (checkOnly) {
  console.error("\ndocs/ 和 TownPass 不一致。執行 npm run docs:sync 同步（不要直接改本 repo 的 docs/）。");
  process.exit(1);
}

for (const f of [...added, ...changed]) {
  mkdirSync(dirname(join(target, f)), { recursive: true });
  copyFileSync(join(source, f), join(target, f));
}
for (const f of removed) rmSync(join(target, f));
console.log(`\n已同步：新增 ${added.length}、修改 ${changed.length}、刪除 ${removed.length}。記得 commit docs/。`);
