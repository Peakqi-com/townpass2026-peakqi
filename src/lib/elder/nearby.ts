/**
 * M17 附近哪裡可以用：無障礙廁所、親子廁所、哺集乳室、捷運電梯、AED。
 *
 * 題目「用不了」點名的對象除了長輩、視障、聽障，還有孕婦、傷病者、照顧者。
 * 他們出門最常卡住的是「附近有沒有我能用的設施」，所以這頁用目前位置找最近的 3 個，
 * 標題直接說「最近的是哪裡、多遠」，報讀軟體用標題跳讀就能聽到重點。
 *
 * 資料都來自 data.taipei（經過 /api/opendata 代理），欄位名稱保留原始中文。
 * 哺集乳室的資料沒有座標，只能依行政區列出。
 */
import type { LatLng } from "../opendata/geo.ts";
import { districtFromAddress, districtFromCode, isTaipeiDistrict, type TaipeiDistrict } from "../opendata/normalize.ts";
import { formatDistance } from "./places.ts";

type Row = Record<string, unknown>;

export type NearbyKindId = "accessible-toilet" | "family-toilet" | "nursing-room" | "metro-elevator" | "aed";

export interface NearbyKind {
  id: NearbyKindId;
  /** 按鈕上的字 */
  label: string;
  /** 按下時唸出來的話 */
  speak: string;
  /** 給誰用（顯示在按鈕下方，讓人知道這是給自己的） */
  who: string;
  /** /api/opendata 的來源 id（sources.ts 白名單） */
  source: string;
  /** 資料有沒有座標：沒有的只能依行政區列出 */
  located: boolean;
}

export const NEARBY_KINDS: readonly NearbyKind[] = [
  {
    id: "accessible-toilet",
    label: "無障礙廁所",
    speak: "無障礙廁所",
    who: "坐輪椅、拿拐杖、受傷、懷孕的時候",
    source: "toilets",
    located: true,
  },
  {
    id: "metro-elevator",
    label: "捷運電梯",
    speak: "捷運出入口的電梯",
    who: "坐輪椅、推嬰兒車、膝蓋不好的時候",
    source: "metro-elevators",
    located: true,
  },
  {
    id: "nursing-room",
    label: "哺集乳室",
    speak: "哺集乳室",
    who: "餵奶、擠奶的時候",
    source: "nursing-rooms",
    located: false,
  },
  {
    id: "family-toilet",
    label: "親子廁所",
    speak: "親子廁所",
    who: "帶小孩、推嬰兒車的時候",
    source: "family-toilets",
    located: true,
  },
  {
    id: "aed",
    label: "AED",
    speak: "AED，自動體外心臟電擊器",
    who: "有人突然倒下、沒有呼吸的時候",
    source: "aed",
    located: true,
  },
];

export function getNearbyKind(id: string): NearbyKind | undefined {
  return NEARBY_KINDS.find((k) => k.id === id);
}

export interface NearbyPlace {
  key: string;
  name: string;
  address?: string;
  district?: TaipeiDistrict;
  /** 和目前位置的直線距離（公尺）；依行政區列出時沒有 */
  distance?: number;
  lat?: number;
  lng?: number;
  /** 依重要性排列的補充說明 */
  details: string[];
  /** 電話（顯示用的原始文字） */
  phone?: string;
}

function text(value: unknown): string {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim() : "";
}

function count(value: unknown): number {
  const n = Number(text(value));
  return Number.isFinite(n) ? n : 0;
}

function num(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function districtOf(row: Row, ...fields: string[]): TaipeiDistrict | undefined {
  for (const f of fields) {
    const v = text(row[f]);
    if (isTaipeiDistrict(v)) return v;
    const fromCode = districtFromCode(v);
    if (fromCode) return fromCode;
  }
  return undefined;
}

/** 把一筆開放資料轉成畫面要用的地點；不符合這一類（例如沒有無障礙廁座的公廁）回 null */
export function toNearbyPlace(kind: NearbyKindId, row: Row): NearbyPlace | null {
  const base = { distance: num(row.distance), lat: num(row.lat), lng: num(row.lng) };
  switch (kind) {
    case "accessible-toilet": {
      const seats = count(row["無障礙廁座數"]);
      if (seats <= 0) return null;
      const name = text(row["公廁名稱"]);
      const family = count(row["親子廁座數"]);
      const details = [`無障礙廁座 ${seats} 間`];
      if (family > 0) details.push(`也有親子廁座 ${family} 間`);
      const care = text(row["照護床位置"]);
      if (care) details.push(`照護床：${care}`);
      return {
        ...base,
        key: `${name}-${row["公廁地址"]}`,
        name,
        address: text(row["公廁地址"]) || undefined,
        district: districtOf(row, "行政區"),
        details,
      };
    }
    case "family-toilet": {
      const name = text(row["公廁名稱"]);
      const where = text(row["公廁位置"]);
      const details: string[] = [];
      if (where && where !== "親子") details.push(`位置：${where}`);
      if (count(row["尿布臺設置數量"]) > 0) details.push("有尿布台");
      if (count(row["兒童座椅設置數量"]) > 0) details.push("有兒童安全座椅");
      return {
        ...base,
        key: `${name}-${where}-${row["公廁地址"]}`,
        name,
        address: text(row["公廁地址"]) || undefined,
        district: districtOf(row, "行政區"),
        details,
      };
    }
    case "nursing-room": {
      const name = text(row["機構名稱"]);
      const address = text(row["地址"]);
      const details: string[] = [];
      const open = text(row["開放時間"]);
      if (open) details.push(`開放時間：${open}`);
      const guide = text(row["位置指引"]);
      if (guide) details.push(`位置：${guide}`);
      const phone = text(row["電話"]);
      const ext = text(row["分機"]);
      return {
        ...base,
        key: `${name}-${address}`,
        name,
        address: address || undefined,
        // 約 2% 的資料行政區代碼和地址不同區（2026-11-07 全部 526 筆比對），以人要走去的地址為準
        district: districtFromAddress(address) ?? districtOf(row, "行政區"),
        details,
        phone: phone ? `${phone}${ext ? ` ${ext}` : ""}` : undefined,
      };
    }
    case "metro-elevator": {
      const name = text(row["出入口電梯/無障礙坡道名稱"]);
      if (!name) return null;
      const exit = text(row["出入口編號"]);
      return {
        ...base,
        key: `${name}-${exit}`,
        name,
        details: exit ? [`在${exit}`] : [],
      };
    }
    case "aed": {
      const name = text(row["場所名稱"]);
      const spot = text(row["AED放置地點"]);
      const note = text(row["AED地點描述"]);
      const details: string[] = [];
      if (spot) details.push(`放在：${spot}`);
      if (note && note !== spot) details.push(note);
      return {
        ...base,
        key: `${name}-${row["場所地址"]}-${spot}`,
        name,
        address: text(row["場所地址"]) || undefined,
        district: districtOf(row, "區域代碼"),
        details,
      };
    }
  }
}

/** 轉換、去掉不符合的，依距離排序後取前幾個（有距離的排前面） */
export function pickPlaces(kind: NearbyKindId, rows: readonly Row[], limit = 3): NearbyPlace[] {
  const seen = new Set<string>();
  const places: NearbyPlace[] = [];
  for (const row of rows) {
    const p = toNearbyPlace(kind, row);
    if (!p || seen.has(p.key)) continue;
    seen.add(p.key);
    places.push(p);
  }
  places.sort((a, b) => (a.distance ?? Infinity) - (b.distance ?? Infinity));
  return places.slice(0, limit);
}

/** 只留某一區的地點（拿不到位置、或資料沒有座標時用） */
export function inDistrict(kind: NearbyKindId, rows: readonly Row[], district: TaipeiDistrict): Row[] {
  return rows.filter((row) => toNearbyPlace(kind, row)?.district === district);
}

/** 結果的第一句：最近的是哪裡、多遠。報讀軟體和長輩先聽到這句 */
export function nearbyHeadline(
  kind: NearbyKind,
  places: readonly NearbyPlace[],
  where: { district?: TaipeiDistrict; radius?: number; total?: number },
): string {
  const first = places[0];
  if (!first) {
    if (where.district) return `${where.district}沒有找到${kind.label}。`;
    return `附近 ${formatDistance(where.radius ?? 1000)}內沒有找到${kind.label}。`;
  }
  if (first.distance !== undefined) return `最近的${kind.label}在${first.name}，約 ${formatDistance(first.distance)}。`;
  const total = Math.max(where.total ?? places.length, places.length);
  const more = total > places.length ? `，先列出 ${places.length} 間` : "";
  return `${where.district ?? "這一區"}有 ${total} 間${kind.label}${more}。`;
}

/** 「怎麼去」：有座標就直接標在 OpenStreetMap 上（禁止 Google Maps） */
export function osmPointUrl(place: Pick<NearbyPlace, "lat" | "lng">): string | null {
  if (place.lat === undefined || place.lng === undefined) return null;
  const lat = place.lat.toFixed(6);
  const lng = place.lng.toFixed(6);
  return `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=18/${lat}/${lng}`;
}

/** 有沒有拿到可以用的位置（在臺北市附近才算） */
export type NearbyCenter = LatLng | null;
