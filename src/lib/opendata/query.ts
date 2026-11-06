/**
 * 代理的查詢參數：讓手機只拿需要的資料，不必下載整包（有的來源好幾 MB）
 *   near=25.03,121.56  以這個點為中心（會依距離由近到遠排序，並附上 distance 公尺）
 *   radius=1000        半徑公尺（預設 1000，範圍 50～10000）
 *   limit=100          最多回傳幾筆（預設 100，最多 1000）
 *   q=大安             關鍵字，比對所有文字欄位（最多 50 字）
 */
import { distanceMeters, isInTaipeiArea, type LatLng } from "./geo.ts";

export interface QueryOptions {
  near?: LatLng;
  radius: number;
  limit: number;
  q?: string;
}

type GeoRecord = Record<string, unknown> & { lat?: number; lng?: number };

export const DEFAULT_LIMIT = 100;
export const MAX_LIMIT = 1000;
export const DEFAULT_RADIUS = 1000;

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));

export function parseQuery(params: URLSearchParams): QueryOptions | { error: string } {
  const opts: QueryOptions = { radius: DEFAULT_RADIUS, limit: DEFAULT_LIMIT };

  const near = params.get("near");
  if (near) {
    const [lat, lng] = near.split(",").map(Number);
    const point = { lat, lng };
    if (!isInTaipeiArea(point)) return { error: "near 格式應為「緯度,經度」，且位於大臺北範圍內，例如 near=25.0375,121.5637" };
    opts.near = point;
  }

  const radius = params.get("radius");
  if (radius !== null) {
    const n = Number(radius);
    if (!Number.isFinite(n)) return { error: "radius 必須是數字（公尺）" };
    opts.radius = clamp(n, 50, 10_000);
  }

  const limit = params.get("limit");
  if (limit !== null) {
    const n = Number(limit);
    if (!Number.isInteger(n)) return { error: "limit 必須是整數" };
    opts.limit = clamp(n, 1, MAX_LIMIT);
  }

  const q = params.get("q")?.trim();
  if (q) opts.q = q.slice(0, 50).toLowerCase();

  return opts;
}

export function applyQuery<T extends GeoRecord>(records: T[], opts: QueryOptions): { total: number; records: (T & { distance?: number })[] } {
  let result: (T & { distance?: number })[] = records;

  if (opts.q) {
    const q = opts.q;
    result = result.filter((r) => Object.values(r).some((v) => typeof v === "string" && v.toLowerCase().includes(q)));
  }

  if (opts.near) {
    const center = opts.near;
    result = result
      .filter((r): r is T & { lat: number; lng: number } => typeof r.lat === "number" && typeof r.lng === "number")
      .map((r) => ({ ...r, distance: Math.round(distanceMeters(center, r)) }))
      .filter((r) => r.distance <= opts.radius)
      .sort((a, b) => a.distance - b.distance);
  }

  return { total: result.length, records: result.slice(0, opts.limit) };
}
