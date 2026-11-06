/**
 * 網頁端呼叫開放資料代理（在 'use client' 元件裡使用）
 *
 * @example 找目前位置 500 公尺內的公廁
 *   const pos = await getLocation();               // 來自 @/lib/townpass/bridge
 *   const res = await getOpenData("toilets", { near: pos ?? undefined, radius: 500, limit: 20 });
 *   res.records.forEach((r) => console.log(r["公廁名稱"], r.distance, "公尺"));
 */
import type { LatLng } from "./geo.ts";

export interface OpenDataResponse<T = Record<string, unknown>> {
  source: { id: string; title: string; url: string; license: string };
  fetchedAt: string;
  sourceUpdatedAt: string | null;
  /** 上游失敗時回傳的是舊資料 */
  stale: boolean;
  /** 符合條件的總筆數（limit 之前） */
  total: number;
  count: number;
  records: (T & { lat?: number; lng?: number; distance?: number })[];
}

export interface OpenDataQuery {
  near?: LatLng;
  /** 公尺，預設 1000 */
  radius?: number;
  /** 預設 100，最多 1000 */
  limit?: number;
  q?: string;
}

export async function getOpenData<T = Record<string, unknown>>(
  source: string,
  query: OpenDataQuery = {},
  init?: { signal?: AbortSignal },
): Promise<OpenDataResponse<T>> {
  const params = new URLSearchParams();
  if (query.near) params.set("near", `${query.near.lat.toFixed(5)},${query.near.lng.toFixed(5)}`);
  if (query.radius !== undefined) params.set("radius", String(query.radius));
  if (query.limit !== undefined) params.set("limit", String(query.limit));
  if (query.q) params.set("q", query.q);

  const qs = params.toString();
  const res = await fetch(`/api/opendata/${encodeURIComponent(source)}${qs ? `?${qs}` : ""}`, { signal: init?.signal });
  const body = await res.json();
  if (!res.ok) throw new Error(body?.error ?? `開放資料讀取失敗（${res.status}）`);
  return body as OpenDataResponse<T>;
}
