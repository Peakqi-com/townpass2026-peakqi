/**
 * 開放資料解析工具（不依賴任何套件）
 * - data.taipei 有不少檔案是 Big5，直接用 response.text() 會變亂碼
 * - UTF-8 檔案常帶 BOM
 */

export type Encoding = "utf-8" | "big5";
export type RawRecord = Record<string, string>;

/** 依指定編碼解碼，並去掉 BOM */
export function decodeBody(buffer: ArrayBuffer | Uint8Array, encoding: Encoding): string {
  const text = new TextDecoder(encoding).decode(buffer);
  return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
}

/** RFC 4180 CSV 解析：支援引號、欄位內逗號與換行、CRLF。回傳以表頭為 key 的物件陣列 */
export function parseCsv(text: string): RawRecord[] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += c;
    }
  }
  if (field !== "" || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  const [header, ...data] = rows;
  if (!header) return [];
  const keys = header.map((h) => h.trim());
  return data
    .filter((r) => r.some((v) => v.trim() !== ""))
    .map((r) => {
      const record: RawRecord = {};
      keys.forEach((key, i) => {
        if (key) record[key] = (r[i] ?? "").trim();
      });
      return record;
    });
}

const XML_ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" };

function decodeXmlEntities(s: string): string {
  return s.replace(/&(amp|lt|gt|quot|apos);/g, (_, name: string) => XML_ENTITIES[name]);
}

/**
 * 解析「扁平」的 XML 紀錄，例如 <PARK><ID>1</ID><NAME>…</NAME></PARK>。
 * 只取 `<TAG>文字</TAG>` 形式的欄位；巢狀欄位會被攤平，同名欄位以第一個為準。
 */
export function parseXmlRecords(xml: string, recordTag: string): RawRecord[] {
  const recordRe = new RegExp(`<${recordTag}>([\\s\\S]*?)</${recordTag}>`, "g");
  const fieldRe = /<([A-Za-z_][\w.-]*)>([^<]*)<\/\1>/g;
  const records: RawRecord[] = [];
  for (const [, body] of xml.matchAll(recordRe)) {
    const record: RawRecord = {};
    for (const [, tag, value] of body.matchAll(fieldRe)) {
      if (!(tag in record)) record[tag] = decodeXmlEntities(value.trim());
    }
    records.push(record);
  }
  return records;
}

/** 取得 XML 中第一個指定標籤的文字 */
export function xmlText(xml: string, tag: string): string | undefined {
  const m = xml.match(new RegExp(`<${tag}>([^<]*)</${tag}>`));
  return m ? decodeXmlEntities(m[1].trim()) : undefined;
}

/** 字串轉數字；空字串或無法解析時回傳 undefined */
export function toNumber(value: unknown): number | undefined {
  if (typeof value === "number") return Number.isFinite(value) ? value : undefined;
  if (typeof value !== "string" || value.trim() === "") return undefined;
  const n = Number(value.trim());
  return Number.isFinite(n) ? n : undefined;
}
