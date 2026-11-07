/**
 * OpenDocument 試算表（.ods）解析，不依賴任何套件。
 *
 * 為什麼需要：data.taipei 的〈臺北市可供避難收容處所一覽表〉目錄上標 CSV，
 * 實際下載卻是 .ods（2026-11-07 實測）。.ods 是 zip 壓縮檔，表格內容在 content.xml。
 *
 * 做法：用 zip 檔尾的中央目錄找到 content.xml，用 Node 內建的 zlib 解壓縮（deflate），
 * 再把 <table:table-row>／<table:table-cell> 轉成字串陣列。只讀第一張工作表。
 */
import { inflateRawSync } from "node:zlib";
import type { RawRecord } from "./parse.ts";

const END_OF_CENTRAL_DIR = 0x06054b50;
const CENTRAL_FILE_HEADER = 0x02014b50;
const LOCAL_FILE_HEADER = 0x04034b50;

/** 從 zip 檔取出一個檔案的內容；沒有這個檔案時回 undefined */
export function readZipEntry(zip: Uint8Array, name: string): Buffer | undefined {
  const buf = Buffer.from(zip.buffer, zip.byteOffset, zip.byteLength);
  // 檔尾的「中央目錄結尾」最少 22 bytes，後面可能接最長 65535 bytes 的註解
  let end = -1;
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 22 - 0xffff); i--) {
    if (buf.readUInt32LE(i) === END_OF_CENTRAL_DIR) {
      end = i;
      break;
    }
  }
  if (end < 0) throw new Error("不是 zip 檔（找不到中央目錄）");

  const count = buf.readUInt16LE(end + 10);
  let p = buf.readUInt32LE(end + 16);
  for (let n = 0; n < count; n++) {
    if (buf.readUInt32LE(p) !== CENTRAL_FILE_HEADER) throw new Error("zip 中央目錄格式錯誤");
    const method = buf.readUInt16LE(p + 10);
    const compressedSize = buf.readUInt32LE(p + 20);
    const nameLength = buf.readUInt16LE(p + 28);
    const extraLength = buf.readUInt16LE(p + 30);
    const commentLength = buf.readUInt16LE(p + 32);
    const localOffset = buf.readUInt32LE(p + 42);
    const entryName = buf.toString("utf8", p + 46, p + 46 + nameLength);
    p += 46 + nameLength + extraLength + commentLength;
    if (entryName !== name) continue;

    // 大小以中央目錄為準（本地標頭在使用 data descriptor 時會是 0）
    if (buf.readUInt32LE(localOffset) !== LOCAL_FILE_HEADER) throw new Error("zip 本地標頭格式錯誤");
    const start = localOffset + 30 + buf.readUInt16LE(localOffset + 26) + buf.readUInt16LE(localOffset + 28);
    const data = buf.subarray(start, start + compressedSize);
    if (method === 0) return Buffer.from(data);
    if (method === 8) return inflateRawSync(data);
    throw new Error(`不支援的 zip 壓縮方式：${method}`);
  }
  return undefined;
}

const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" };

function decodeEntities(text: string): string {
  return text.replace(/&(#x[0-9a-f]+|#\d+|amp|lt|gt|quot|apos);/gi, (_, e: string) => {
    if (e[0] === "#") return String.fromCodePoint(e[1] === "x" || e[1] === "X" ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10));
    return ENTITIES[e.toLowerCase()];
  });
}

/** 一格的文字：多個 <text:p> 用換行接起來；<text:s/> 是空白、<text:tab/> 是 tab、<text:line-break/> 是換行 */
function cellText(inner: string): string {
  const paragraphs = [...inner.matchAll(/<text:p\b[^>]*?(?:\/>|>([\s\S]*?)<\/text:p>)/g)].map((m) => m[1] ?? "");
  return paragraphs
    .map((p) =>
      decodeEntities(
        p
          .replace(/<text:s\b[^>]*?c="(\d+)"[^>]*\/>/g, (_, n: string) => " ".repeat(Number(n)))
          .replace(/<text:s\b[^>]*\/>/g, " ")
          .replace(/<text:tab\b[^>]*\/>/g, "\t")
          .replace(/<text:line-break\b[^>]*\/>/g, "\n")
          .replace(/<[^>]+>/g, ""),
      ),
    )
    .join("\n");
}

/** 檔案常把整列空白重複上千次、或把空白欄重複到 1024 欄；只展開有內容的部分 */
const MAX_REPEAT = 64;

/** content.xml 第一張工作表的每一列（略過全空白的列，去掉每列尾端的空白欄） */
export function odsRows(contentXml: string): string[][] {
  const table = contentXml.match(/<table:table\b[\s\S]*?<\/table:table>/)?.[0] ?? "";
  const rows: string[][] = [];
  for (const rowMatch of table.matchAll(/<table:table-row\b[^>]*?(?:\/>|>([\s\S]*?)<\/table:table-row>)/g)) {
    const cells: string[] = [];
    const inner = rowMatch[1] ?? "";
    for (const cell of inner.matchAll(
      /<table:(table-cell|covered-table-cell)\b([^>]*?)(?:\/>|>([\s\S]*?)<\/table:\1>)/g,
    )) {
      const repeat = Number(cell[2].match(/table:number-columns-repeated="(\d+)"/)?.[1] ?? 1);
      const text = cell[1] === "covered-table-cell" ? "" : cellText(cell[3] ?? "");
      for (let i = 0; i < Math.min(repeat, MAX_REPEAT); i++) cells.push(text);
    }
    while (cells.length > 0 && cells[cells.length - 1].trim() === "") cells.pop();
    if (cells.length > 0) rows.push(cells);
  }
  return rows;
}

/** .ods 檔 → 以第一列為表頭的物件陣列（和 parseCsv 的輸出一樣） */
export function odsToRecords(zip: Uint8Array): RawRecord[] {
  const content = readZipEntry(zip, "content.xml");
  if (!content) throw new Error(".ods 裡沒有 content.xml");
  const [header, ...rows] = odsRows(content.toString("utf8"));
  if (!header) return [];
  const keys = header.map((h) => h.trim());
  return rows.map((row) => Object.fromEntries(keys.map((k, i) => [k, (row[i] ?? "").trim()])));
}
