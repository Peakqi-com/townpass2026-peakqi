/**
 * M16 公車：網頁端呼叫 /api/bus/*（只能在瀏覽器端用）。
 */
import type { BusCity, BusRoute } from "./bus.ts";
import type { FamilyBus } from "../elder/familyConfig.ts";

export interface BusDirectionView {
  goBack: 0 | 1;
  label: string;
  /** lat／lng：站牌位置，家人選好後存進設定碼，「帶我走到站牌」斷網也能用 */
  stops: { id: number; name: string; seq: number; lat?: number; lng?: number }[];
}

export interface BusEtaItem {
  city: BusCity;
  routeId: number;
  stopId: number;
  seconds: number | null;
  text: string;
}

async function getJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { signal: AbortSignal.timeout(20_000), ...init });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((body as { error?: string }).error ?? `HTTP ${res.status}`);
  return body as T;
}

export async function searchBusRoutes(q: string): Promise<BusRoute[]> {
  return (await getJson<{ routes: BusRoute[] }>(`/api/bus/routes?q=${encodeURIComponent(q)}`)).routes;
}

export async function getBusDirections(city: BusCity, routeId: number): Promise<BusDirectionView[]> {
  return (await getJson<{ directions: BusDirectionView[] }>(`/api/bus/stops?city=${city}&route=${routeId}`)).directions;
}

export async function getBusEta(buses: readonly FamilyBus[]): Promise<{ checkedAt: string; items: BusEtaItem[]; source: { title: string; url: string } }> {
  const t = buses.map((b) => `${b.city}:${b.routeId}:${b.stopId}`).join(",");
  // no-store：不用瀏覽器的 HTTP 快取。回應的 stale-while-revalidate 是給 CDN 的，
  // 瀏覽器也會遵守：斷網時會把 15 秒內的舊回應當成成功，長輩會看到過時的「還有幾分鐘」
  return getJson(`/api/bus/eta?t=${encodeURIComponent(t)}`, { cache: "no-store" });
}
