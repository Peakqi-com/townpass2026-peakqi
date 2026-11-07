/**
 * 長輩服務資料集（共餐、關懷據點、長青學苑、樂齡學習、老人服務中心）的欄位整理。
 *
 * 這幾個資料集的坑（2026-11-07 實際下載確認）：
 * - 沒有經緯度，只能用行政區篩選；但有的只有「行政區代碼」（63000040），有的地址沒寫「臺北市○○區」
 * - 欄位內有換行，而且常斷在字中間（「士林歌珊\n堂」）；電話欄位的換行則是分隔兩支電話
 * - 名稱裡混了康熙部首「⾧」（U+2FA7）和筆畫「㇐」（U+31D0），看起來像「長」「一」，報讀軟體卻唸不對
 *
 * 處理方式：保留原始中文欄位（清理過），另外加上 `district`（行政區），讓代理的 `q=中山區` 一定比對得到。
 */
import type { RawRecord } from "./parse.ts";

export const TAIPEI_DISTRICTS = [
  "松山區",
  "信義區",
  "大安區",
  "中山區",
  "中正區",
  "大同區",
  "萬華區",
  "文山區",
  "南港區",
  "內湖區",
  "士林區",
  "北投區",
] as const;

export type TaipeiDistrict = (typeof TAIPEI_DISTRICTS)[number];

export function isTaipeiDistrict(value: unknown): value is TaipeiDistrict {
  return typeof value === "string" && (TAIPEI_DISTRICTS as readonly string[]).includes(value);
}

/**
 * 行政區代碼：63000010 松山區 … 63000120 北投區，順序和 TAIPEI_DISTRICTS 相同。
 * 對照依據：〈老人共餐單位一覽表〉440 筆同時有「行政區」與「行政區代碼」，兩者完全一致。
 */
export function districtFromCode(code: unknown): TaipeiDistrict | undefined {
  if (typeof code !== "string") return undefined;
  const m = code.trim().match(/^63000(\d{2})0$/);
  if (!m) return undefined;
  return TAIPEI_DISTRICTS[Number(m[1]) - 1];
}

/** 地址裡第一個出現的行政區（有的地址寫了兩個地點，以第一個為準） */
export function districtFromAddress(address: unknown): TaipeiDistrict | undefined {
  if (typeof address !== "string") return undefined;
  let best: { district: TaipeiDistrict; index: number } | undefined;
  for (const district of TAIPEI_DISTRICTS) {
    const index = address.indexOf(district);
    if (index >= 0 && (!best || index < best.index)) best = { district, index };
  }
  return best?.district;
}

const ASCII_ALNUM = /[0-9A-Za-z]/;
const ASCII = /[\x21-\x7e]/;

/** 清理一格資料：處理欄位內換行、異體字，去掉前後空白 */
export function cleanCell(value: string): string {
  const fixed = value
    // 康熙部首（U+2F00～U+2FDF）用 NFKC 換回一般漢字，例如「⾧」→「長」
    .replace(/[⼀-⿟]/g, (c) => c.normalize("NFKC"))
    // CJK 筆畫「㇐」NFKC 不會轉，手動換成「一」
    .replace(/㇐/g, "一");

  return fixed
    .replace(/[ \t]*\r?\n[ \t]*/g, (match: string, offset: number, whole: string) => {
      const prev = whole[offset - 1] ?? "";
      const next = whole[offset + match.length] ?? "";
      if (prev === "-" || prev === "/") return ""; // 電話號碼斷行：「0912-\n345678」
      if (ASCII_ALNUM.test(prev) && ASCII_ALNUM.test(next)) return "、"; // 兩支電話：「…504\n0936…」
      if (prev && next && !ASCII.test(prev) && !ASCII.test(next)) return ""; // 斷在中文字中間
      return " ";
    })
    .trim();
}

export type ElderRecord = RawRecord & { district?: TaipeiDistrict };

/**
 * 整理一筆長輩服務資料：每個欄位 cleanCell，並加上 district。
 * 行政區的判斷順序：「行政區」欄位 → 「行政區代碼」 → 地址。
 */
export function normalizeElderRecord(record: RawRecord, opts: { address: string }): ElderRecord {
  const cleaned: ElderRecord = {};
  for (const [key, value] of Object.entries(record)) cleaned[key] = cleanCell(value);
  const district =
    [cleaned["行政區"]].find(isTaipeiDistrict) ??
    districtFromCode(cleaned["行政區代碼"]) ??
    // 衛生局的資料集把代碼放在「行政區域代碼」，或直接放在「行政區」欄位（63000040）
    districtFromCode(cleaned["行政區域代碼"]) ??
    districtFromCode(cleaned["行政區"]) ??
    districtFromAddress(cleaned[opts.address]);
  if (district) cleaned.district = district;
  return cleaned;
}

/** 〈樂齡學習據點〉有兩個資源（樂齡學堂、樂齡學習中心），合併成一個來源並標上 kind */
export function mergeLohas(schools: RawRecord[], centers: RawRecord[]): (ElderRecord & { kind: string })[] {
  return [
    ...schools.map((r) => ({ ...normalizeElderRecord(r, { address: "地址" }), kind: "樂齡學堂" })),
    ...centers.map((r) => ({ ...normalizeElderRecord(r, { address: "地址" }), kind: "樂齡學習中心" })),
  ];
}
