/**
 * M10 視障出門：找最近的捷運站，用「一句話」回答電梯在哪、有沒有異常，再列出附近的有聲號誌路口。
 * 規格見 docs/elder-mode-spec.md M10。
 *
 * 地圖對報讀軟體幾乎讀不到，所以這裡只產生文字；標題和第一句放重點（視障者習慣 3～5 倍速、跳著聽）。
 *
 * 資料（都經過 /api/opendata 代理）：
 * - metro-station-facilities：車站無障礙設施（119 站，沒有座標）
 * - metro-elevators：出入口電梯、無障礙坡道的座標（193 筆），用來算最近的車站
 * - metro-accessibility-alerts：無障礙設施異常公告（有異常才有資料）
 * - audible-signals：有聲號誌路口（191 筆，WGS84）
 */
import { distanceMeters, type LatLng } from "../opendata/geo.ts";

type Row = Record<string, unknown>;
const str = (v: unknown): string => (typeof v === "string" ? v.trim() : "");
const num = (v: unknown): number | undefined => (typeof v === "number" && Number.isFinite(v) ? v : undefined);

export interface StationExit {
  /** 例如「出口2」「出口M4」「單一出口」 */
  label: string;
  kind: "電梯" | "坡道" | "出入口";
  lat: number;
  lng: number;
}

export interface Station {
  name: string;
  lines: string[];
  /** 站號，例如 ["BL12", "R10"] */
  codes: string[];
  /** 以下是原始文字，多線車站用「【線名】…。」分段 */
  elevators: string;
  tactile: string;
  prioritySeats: string;
  infoDesk: string;
  signLanguage: boolean;
  exits: StationExit[];
}

export interface Segment {
  lines: string[];
  value: string;
}

/** 拆開「【淡水信義線】出口M2。【板南線】出口M4。」；「【A】/【B】…」表示兩條線相同 */
export function segments(text: string): Segment[] {
  const t = text.trim();
  if (!t.includes("【")) return [{ lines: [], value: t.replace(/。$/, "") }];
  const result: Segment[] = [];
  for (const [, prefix, value] of t.matchAll(/((?:【[^】]+】\/?)+)([^【]*)/g)) {
    const lines = [...prefix.matchAll(/【([^】]+)】/g)].map((m) => m[1]);
    result.push({ lines, value: value.trim().replace(/。$/, "") });
  }
  return result;
}

function exitLabel(code: string): string {
  if (!code) return "出入口";
  if (code.includes("出口")) return code;
  return `出口${code}`;
}

/** 把車站設施與出入口電梯座標合併。電梯名稱是「台北車站出口電梯1」，用最長的車站名稱前綴對應 */
export function buildStations(facilities: readonly Row[], elevators: readonly Row[]): Station[] {
  const stations: Station[] = facilities.map((f) => ({
    name: str(f.Station_Name),
    lines: str(f.Line).split("/").filter(Boolean),
    codes: str(f.Station_Number).split("/").filter(Boolean),
    elevators: str(f.Elevator_and_Wheelchair_Ramps),
    tactile: str(f.Tactile_Guide_Paths_quantity),
    prioritySeats: str(f.Priority_Seats_for_Visually_Impaired_Passengers),
    infoDesk: str(f.PAO),
    signLanguage: Number(str(f["1999_Sign_Language_Service_quantity"])) > 0,
    exits: [],
  }));
  const byLongestName = [...stations].sort((a, b) => b.name.length - a.name.length);

  for (const e of elevators) {
    const lat = num(e.lat);
    const lng = num(e.lng);
    if (lat === undefined || lng === undefined) continue;
    const name = str(e["出入口電梯/無障礙坡道名稱"]);
    const station = byLongestName.find((s) => s.name && name.startsWith(s.name));
    if (!station) continue;
    const kind = name.includes("電梯") ? "電梯" : name.includes("坡道") ? "坡道" : "出入口";
    station.exits.push({ label: exitLabel(str(e["出入口編號"])), kind, lat, lng });
  }
  return stations;
}

export function nearestStation(stations: readonly Station[], point: LatLng): { station: Station; exit: StationExit; distance: number } | null {
  let best: { station: Station; exit: StationExit; distance: number } | null = null;
  for (const station of stations) {
    for (const exit of station.exits) {
      const distance = distanceMeters(point, exit);
      if (!best || distance < best.distance) best = { station, exit, distance };
    }
  }
  return best;
}

/** 站的中心點（各出入口的平均），手動選站時用來找附近的有聲號誌 */
export function stationCenter(station: Station): LatLng | null {
  if (station.exits.length === 0) return null;
  const sum = station.exits.reduce((acc, e) => ({ lat: acc.lat + e.lat, lng: acc.lng + e.lng }), { lat: 0, lng: 0 });
  return { lat: sum.lat / station.exits.length, lng: sum.lng / station.exits.length };
}

export function formatDistance(meters: number): string {
  if (meters < 995) return `${Math.max(10, Math.round(meters / 10) * 10)} 公尺`;
  return `${Number((meters / 1000).toFixed(1))} 公里`;
}

/* ---------- 異常公告 ---------- */

export interface StationAlert {
  time: string;
  text: string;
}

/** 20261101T224000 → 11月1日 22:40；其他格式原樣回傳 */
export function formatAlertTime(raw: string): string {
  const m = raw.trim().match(/^\d{4}(\d{2})(\d{2})T(\d{2})(\d{2})/);
  return m ? `${Number(m[1])}月${Number(m[2])}日 ${m[3]}:${m[4]}` : raw.trim();
}

/** 去掉【】和「歡迎搭乘，造成不便，敬請見諒」，報讀軟體高速聽時比較快抓到重點 */
export function cleanAlertText(raw: string): string {
  return raw
    .replace(/[【】]/g, "")
    .replace(/\s+/g, "")
    .replace(/(?:[，,、]?(?:歡迎搭乘|造成(?:您的)?不便|敬請(?:見諒|包涵)))+/g, "");
}

const stationKey = (name: string) => name.trim().replace(/臺/g, "台").replace(/站$/, "");

export function alertsForStation(alerts: readonly Row[], stationName: string): StationAlert[] {
  const key = stationKey(stationName);
  return alerts
    .filter((a) => str(a["車站"]).split(/[、,，/]/).some((s) => s && stationKey(s) === key))
    .map((a) => ({ time: formatAlertTime(str(a["日期時間"])), text: cleanAlertText(str(a["說明"])) }));
}

/* ---------- 組句子 ---------- */

const KIND_WORD: Record<StationExit["kind"], string> = { 電梯: "電梯", 坡道: "無障礙坡道", 出入口: "無障礙出入口" };

function stationKindWord(station: Station): string {
  const kinds = new Set(station.exits.map((e) => e.kind));
  if (kinds.size === 1) return KIND_WORD[[...kinds][0]];
  return "電梯或無障礙坡道";
}

const linesOf = (s: Segment) => s.lines.join("、");

function elevatorSentence(station: Station): string {
  const word = stationKindWord(station);
  const segs = segments(station.elevators);
  if (segs.length === 1 && segs[0].lines.length === 0) {
    const value = segs[0].value;
    if (value === "單一出口") return `本站只有一個出口，有${word}。`;
    return `${word}在${value}。`;
  }
  return `${word}在${segs.map((s) => `${linesOf(s)}${s.value}`).join("；")}。`;
}

/** 「出口電梯--大廳無障礙閘門--月臺(註：出口2無導盲磚設施)」→ 從出口電梯，接到大廳無障礙閘門、月臺 */
function tactilePhrase(value: string): { route: string | null; note: string | null } {
  const noteMatch = value.match(/[(（]註[:：]([^)）]*)[)）]/);
  const path = value.replace(/[(（]註[:：][^)）]*[)）]/, "").trim();
  if (path === "" || path === "0") return { route: null, note: noteMatch?.[1] ?? null };
  const steps = path.split(/-+/).map((s) => s.trim()).filter(Boolean);
  const route = steps.length >= 2 ? `從${steps[0]}，接到${steps.slice(1).join("、")}` : steps[0];
  return { route, note: noteMatch?.[1] ?? null };
}

function tactileSentence(station: Station): string {
  const segs = segments(station.tactile);
  if (segs.length === 1 && segs[0].lines.length === 0) {
    const { route, note } = tactilePhrase(segs[0].value);
    if (!route) return "資料沒有列出導盲磚路線。";
    return `導盲磚${route}。${note ? `注意：${note}。` : ""}`;
  }
  const parts = segs.map((s) => {
    const { route, note } = tactilePhrase(s.value);
    return `${linesOf(s)}${route ?? "沒有列出"}${note ? `（${note}）` : ""}`;
  });
  return `導盲磚：${parts.join("；")}。`;
}

const isNone = (v: string) => v === "" || v === "無" || v === "0";

function prioritySentence(station: Station): string | null {
  const segs = segments(station.prioritySeats);
  if (segs.every((s) => isNone(s.value))) return null;
  if (segs.length === 1 && segs[0].lines.length === 0) return `視障優先候車在${segs[0].value}。`;
  return `視障優先候車：${segs.map((s) => `${linesOf(s)}${isNone(s.value) ? "沒有" : `在${s.value}`}`).join("；")}。`;
}

function infoDeskSentence(station: Station): string | null {
  const segs = segments(station.infoDesk);
  if (segs.every((s) => s.value === "")) return null;
  if (segs.length === 1 && segs[0].lines.length === 0) return `詢問處在${segs[0].value}，可以請站務人員引導。`;
  return `詢問處：${segs.map((s) => `${linesOf(s)}${s.value}`).join("；")}。可以請站務人員引導。`;
}

function alertSentences(alerts: readonly StationAlert[] | null): string[] {
  if (alerts === null) return ["異常公告暫時讀不到。"];
  if (alerts.length === 0) return ["目前沒有無障礙設施異常公告。"];
  return alerts.map((a) => `異常公告${a.time ? `（${a.time}）` : ""}：${a.text}`);
}

export interface StationAnswer {
  /** 第一句：最近的站與距離；手動選站時是站名加電梯位置 */
  headline: string;
  /** 依重要性排列：電梯、異常公告、導盲磚、優先候車、詢問處、1999 手語 */
  details: string[];
  /** 給報讀軟體或 TTS 唸的一段話（headline＋電梯＋公告＋手語） */
  summary: string;
}

/**
 * 組成給視障者的回答。
 * @param opts.distance／exit 有定位時傳入（最近的出入口與距離）
 * @param opts.alerts 該站的異常公告；null 表示公告讀不到
 */
export function describeStation(
  station: Station,
  opts: { distance?: number; exit?: StationExit; alerts: readonly StationAlert[] | null },
): StationAnswer {
  const elevator = elevatorSentence(station);
  const located = opts.distance !== undefined && opts.exit !== undefined;
  const headline = located
    ? `離您最近的是${station.name}，${opts.exit!.label}的${KIND_WORD[opts.exit!.kind]}約 ${formatDistance(opts.distance!)}。`
    : `${station.name}：${elevator}`;
  const alerts = alertSentences(opts.alerts);
  const signLanguage = station.signLanguage ? "本站有 1999 手語視訊，可以請站務人員協助。" : null;

  const details = [
    ...(located ? [elevator] : []),
    ...alerts,
    tactileSentence(station),
    prioritySentence(station),
    infoDeskSentence(station),
    signLanguage,
  ].filter((s): s is string => Boolean(s));

  const summary = [headline, ...(located ? [elevator] : []), ...alerts, ...(signLanguage ? [signLanguage] : [])].join("");
  return { headline, details, summary };
}

/* ---------- 有聲號誌 ---------- */

export interface Signal {
  name: string;
  district: string;
  distance: number;
  lat: number;
  lng: number;
}

/** 「八德路二段　　建國北一段」→「八德路二段與建國北一段」 */
export function signalName(raw: string): string {
  return raw.split(/[\s　]+/).filter(Boolean).join("與");
}

export function nearestSignals(signals: readonly Row[], point: LatLng, count = 3): Signal[] {
  const result: Signal[] = [];
  for (const s of signals) {
    const lat = num(s.lat);
    const lng = num(s.lng);
    if (lat === undefined || lng === undefined) continue;
    result.push({ name: signalName(str(s["路口"])), district: str(s["行政區"]), distance: distanceMeters(point, { lat, lng }), lat, lng });
  }
  return result.sort((a, b) => a.distance - b.distance).slice(0, count);
}

/** 給報讀軟體或 TTS 唸的有聲號誌句子；null 表示資料讀不到 */
export function signalsSentence(signals: readonly Signal[] | null): string {
  if (signals === null) return "有聲號誌資料暫時讀不到。";
  if (signals.length === 0) return "附近沒有有聲號誌路口的資料。";
  return `附近的有聲號誌路口：${signals.map((s) => `${s.name}，約 ${formatDistance(s.distance)}`).join("；")}。`;
}

/* ---------- 手動選站 ---------- */

/** 路線順序與站號字首（臺北捷運官方編號） */
const LINES: { line: string; prefix: string }[] = [
  { line: "文湖線", prefix: "BR" },
  { line: "淡水信義線", prefix: "R" },
  { line: "松山新店線", prefix: "G" },
  { line: "中和新蘆線", prefix: "O" },
  { line: "板南線", prefix: "BL" },
  { line: "環狀線", prefix: "Y" },
];

/**
 * 依路線分組、照站號排序，給沒有定位權限時選車站。
 * 注意：資料裡多線車站的 Line 和 Station_Number 順序不一定一致（台北車站是「淡水信義線/板南線」配「BL12/R10」），
 * 所以用站號字首判斷路線。
 */
export function stationsByLine(stations: readonly Station[]): { line: string; stations: Station[] }[] {
  const groups = LINES.map(({ line }) => ({ line, items: [] as { order: number; station: Station }[] }));
  for (const station of stations) {
    for (const code of station.codes) {
      const m = code.match(/^([A-Z]+)(\d+)([A-Z]?)$/);
      if (!m) continue;
      const index = LINES.findIndex((l) => l.prefix === m[1]);
      if (index < 0) continue;
      groups[index].items.push({ order: Number(m[2]) + (m[3] ? 0.5 : 0), station });
    }
  }
  return groups
    .filter((g) => g.items.length > 0)
    .map((g) => ({ line: g.line, stations: g.items.sort((a, b) => a.order - b.order).map((i) => i.station) }));
}
