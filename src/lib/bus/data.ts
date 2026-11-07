/**
 * M16 公車資料的抓取與快取（只在伺服器端用：Route Handler）。
 *
 * 白名單：只抓下面這 6 個固定網址（臺北市公運處 blob，data.taipei〈臺北市路線〉〈臺北市站牌〉
 * 〈臺北市預估到站時間(公車)〉與新北市的同名資料集所列的介接網址），不接受任意網址。
 *
 * 檔案都是 gzip 的 JSON（回應沒有 Content-Encoding），用 Node 內建 zlib 解壓。
 * - 路線、站牌：一天快取一次（站牌檔解壓後約 10 MB，只在家人設定時才用到）
 * - 預估到站：上游每 15～20 秒更新，快取 20 秒
 * 上游失敗時，有舊資料就回舊資料（stale），服務不中斷。
 */
import { gunzipSync } from "node:zlib";
import { fetchBuffer } from "../opendata/sources.ts";
import { parseEstimates, parseRoutes, parseStops, type BusCity, type BusEstimate, type BusRoute, type BusStop } from "./bus.ts";

const BLOB: Record<BusCity, string> = {
  tpe: "https://tcgbusfs.blob.core.windows.net/blobbus/",
  ntpc: "https://tcgbusfs.blob.core.windows.net/ntpcbus/",
};
export const BUS_CITIES: readonly BusCity[] = ["tpe", "ntpc"];

/** 出處（README、畫面上的資料來源） */
export const BUS_DATASETS = {
  estimate: { title: "臺北市預估到站時間(公車)", url: "https://data.taipei/dataset/detail?id=f11a5af0-7b37-48ef-98cc-f6f102ed43c6" },
  route: { title: "臺北市路線", url: "https://data.taipei/dataset/detail?id=6a03b03d-90d1-4d9e-a952-c940fd869772" },
  stop: { title: "臺北市站牌", url: "https://data.taipei/dataset/detail?id=62bc76da-6e6b-46ee-8976-c1945092d504" },
} as const;

const DAY = 24 * 60 * 60 * 1000;
const ETA_TTL = 20 * 1000;

interface Entry<T> {
  at: number;
  value: T;
}
const cache = new Map<string, Entry<unknown>>();
const inflight = new Map<string, Promise<unknown>>();

/** 同一個 key 在 ttl 內重用；同時多個請求只打一次上游；失敗時有舊資料就回舊資料 */
async function cached<T>(key: string, ttl: number, load: () => Promise<T>): Promise<{ value: T; stale: boolean }> {
  const hit = cache.get(key) as Entry<T> | undefined;
  if (hit && Date.now() - hit.at < ttl) return { value: hit.value, stale: false };
  const running = inflight.get(key) as Promise<T> | undefined;
  if (running) return { value: await running, stale: false };
  const task = load();
  inflight.set(key, task);
  try {
    const value = await task;
    cache.set(key, { at: Date.now(), value });
    return { value, stale: false };
  } catch (error) {
    if (hit) {
      console.warn(`[bus] ${key} 上游失敗，回傳舊資料：`, error);
      return { value: hit.value, stale: true };
    }
    throw error;
  } finally {
    inflight.delete(key);
  }
}

async function fetchGzJson(url: string): Promise<unknown> {
  return JSON.parse(gunzipSync(await fetchBuffer(url, 30_000)).toString("utf8"));
}

export async function loadRoutes(city: BusCity): Promise<BusRoute[]> {
  return (await cached(`route:${city}`, DAY, async () => parseRoutes(await fetchGzJson(BLOB[city] + "GetRoute.gz"), city))).value;
}

export async function loadStops(city: BusCity): Promise<BusStop[]> {
  return (await cached(`stop:${city}`, DAY, async () => parseStops(await fetchGzJson(BLOB[city] + "GetStop.gz"), city))).value;
}

export async function loadEstimates(city: BusCity): Promise<{ value: BusEstimate[]; stale: boolean }> {
  return cached(`eta:${city}`, ETA_TTL, async () => parseEstimates(await fetchGzJson(BLOB[city] + "GetEstimateTime.gz"), city));
}

export function isBusCity(value: unknown): value is BusCity {
  return value === "tpe" || value === "ntpc";
}
