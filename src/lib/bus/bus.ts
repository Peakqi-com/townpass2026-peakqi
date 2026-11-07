/**
 * M16 公車還有幾分鐘到：純邏輯（不碰網路，可以在 node --test 測試）。
 *
 * 資料：臺北市公共運輸處的 blob（data.taipei〈臺北市路線〉〈臺北市站牌〉〈臺北市預估到站時間(公車)〉，
 * 新北市主管的路線在另一份 ntpcbus）。格式與特殊值的官方說明：公運處〈臺北市Data.Taipei平台API說明文件〉V6.3。
 *
 * 重點（2026-11-07 實測）：
 * - 一個 StopID 就是「某路線、某方向、某一站」，所以設定只要記 { city, routeId, stopId }
 * - 方向要看站牌檔的 goBack（0 去程、1 返程）；預估檔的 GoBack 是「車子目前在跑哪個方向」，不能拿來判斷
 * - EstimateTime 單位是秒；-1 尚未發車、-2 交管不停靠、-3 末班車已過、-4 今日未營運
 * - 臺北、新北兩份資料的 RouteID、StopID 沒有交集，要記是哪一市
 */

export type BusCity = "tpe" | "ntpc";

export interface BusRoute {
  city: BusCity;
  id: number;
  name: string;
  /** 去程起站（返程的終點） */
  departure: string;
  /** 去程終點 */
  destination: string;
}

export interface BusStop {
  city: BusCity;
  id: number;
  routeId: number;
  name: string;
  seq: number;
  /** 0 去程、1 返程 */
  goBack: 0 | 1;
}

export interface BusEstimate {
  city: BusCity;
  routeId: number;
  stopId: number;
  /** 秒；負數是官方特殊值 */
  seconds: number;
}

/** 家人設定的一組公車（存在家人設定碼裡） */
export interface BusTarget {
  city: BusCity;
  routeId: number;
  stopId: number;
}

type BusInfoFile = { BusInfo?: unknown };

const list = (file: unknown): Record<string, unknown>[] => {
  const info = (file as BusInfoFile | null)?.BusInfo;
  return Array.isArray(info) ? info.filter((x): x is Record<string, unknown> => typeof x === "object" && x !== null) : [];
};
const num = (v: unknown): number => (typeof v === "number" ? v : typeof v === "string" && v.trim() !== "" ? Number(v) : NaN);
const str = (v: unknown): string => (typeof v === "string" ? v.trim() : "");

/** GetRoute → 路線。同一個 Id 會因聯營業者、附屬路線重複出現，只留第一筆 */
export function parseRoutes(file: unknown, city: BusCity): BusRoute[] {
  const seen = new Set<number>();
  const routes: BusRoute[] = [];
  for (const r of list(file)) {
    const id = num(r.Id);
    const name = str(r.nameZh);
    if (!Number.isInteger(id) || !name || seen.has(id)) continue;
    seen.add(id);
    routes.push({ city, id, name, departure: str(r.departureZh), destination: str(r.destinationZh) });
  }
  return routes;
}

/** GetStop → 站牌（只留去程、返程；goBack 是字串） */
export function parseStops(file: unknown, city: BusCity): BusStop[] {
  const stops: BusStop[] = [];
  for (const s of list(file)) {
    const id = num(s.Id);
    const routeId = num(s.routeId);
    const goBack = num(s.goBack);
    const seq = num(s.seqNo);
    if (!Number.isInteger(id) || !Number.isInteger(routeId) || (goBack !== 0 && goBack !== 1)) continue;
    stops.push({ city, id, routeId, name: str(s.nameZh), seq: Number.isFinite(seq) ? seq : 0, goBack });
  }
  return stops;
}

/** GetEstimateTime → 預估（EstimateTime 是字串，單位秒） */
export function parseEstimates(file: unknown, city: BusCity): BusEstimate[] {
  const out: BusEstimate[] = [];
  for (const e of list(file)) {
    const routeId = num(e.RouteID);
    const stopId = num(e.StopID);
    const seconds = num(e.EstimateTime);
    if (Number.isInteger(routeId) && Number.isInteger(stopId) && Number.isFinite(seconds)) out.push({ city, routeId, stopId, seconds });
  }
  return out;
}

/** 路線名稱的輸入整理：全形轉半形、去空白、去掉「號公車」「路」這類說法 */
export function normalizeRouteQuery(input: string): string {
  return input
    .replace(/[０-９Ａ-Ｚａ-ｚ]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0))
    .replace(/\s+/g, "")
    .replace(/(號公車|號|公車|路)$/, "");
}

/** 用名稱找路線：完全相同的排第一，其次是開頭相同的（名稱短的優先），最多 8 條 */
export function searchRoutes(routes: readonly BusRoute[], query: string, limit = 8): BusRoute[] {
  const q = normalizeRouteQuery(query);
  if (!q) return [];
  const score = (r: BusRoute) => (r.name === q ? 0 : r.name.startsWith(q) ? 1 : r.name.includes(q) ? 2 : 3);
  return routes
    .filter((r) => score(r) < 3)
    .sort((a, b) => score(a) - score(b) || a.name.length - b.name.length || a.name.localeCompare(b.name, "zh-Hant"))
    .slice(0, limit);
}

export interface BusDirection {
  goBack: 0 | 1;
  /** 「往撫遠街」 */
  label: string;
  stops: BusStop[];
}

/** 一條路線的兩個方向：去程「往終點」、返程「往起點」；站牌照站序 */
export function directionsOf(route: BusRoute, stops: readonly BusStop[]): BusDirection[] {
  const mine = stops.filter((s) => s.city === route.city && s.routeId === route.id);
  return ([0, 1] as const)
    .map((goBack) => ({
      goBack,
      label: `往${goBack === 0 ? route.destination : route.departure}`,
      stops: mine.filter((s) => s.goBack === goBack).sort((a, b) => a.seq - b.seq),
    }))
    .filter((d) => d.stops.length > 0);
}

/** 首頁顯示的名稱，例如「307 往撫遠街・南京三民路口」。存進設定碼，斷網時也看得到 */
export function busLabel(routeName: string, directionLabel: string, stopName: string): string {
  return `${routeName} ${directionLabel}・${stopName}`;
}

export function findEstimate(estimates: readonly BusEstimate[], target: BusTarget): number | undefined {
  return estimates.find((e) => e.city === target.city && e.routeId === target.routeId && e.stopId === target.stopId)?.seconds;
}

/** 預估秒數 → 長輩聽得懂的話（特殊值依公運處 API 說明文件 V6.3） */
export function etaText(seconds: number | undefined): string {
  if (seconds === undefined || !Number.isFinite(seconds)) return "查不到時間";
  if (seconds >= 0) return seconds < 60 ? "快到了" : `還有 ${Math.floor(seconds / 60)} 分鐘`;
  switch (seconds) {
    case -1:
      return "還沒發車";
    case -2:
      return "交通管制，這一站不停";
    case -3:
      return "末班車已經過了";
    case -4:
      return "今天沒有開";
    default:
      return "查不到時間";
  }
}
