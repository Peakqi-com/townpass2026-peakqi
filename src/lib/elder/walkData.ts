/**
 * 步行導航的資料（只能在瀏覽器端用）：路網和有聲號誌路口。
 *
 * 一打開服務就預先載入（OfflineSupport），之後斷網也能算路線。
 * 同一個頁面期間只下載一次（模組裡的 Promise 會留著）。
 */
import { getOpenData } from "../opendata/client.ts";
import { buildGraph, type WalkGraph, type WalkGraphFile } from "./walk.ts";
import { signalName } from "./places.ts";

/** scripts/build-walk-graph.ts 產生的路網（範圍：會場周邊，含明德站、芝山站） */
export const WALK_GRAPH_URL = "/walk/tianmu.json";

let graphPromise: Promise<WalkGraph> | null = null;
let signalsPromise: Promise<AudibleSignal[]> | null = null;

export function loadWalkGraph(): Promise<WalkGraph> {
  graphPromise ??= fetch(WALK_GRAPH_URL)
    .then((res) => {
      if (!res.ok) throw new Error(`路網下載失敗 HTTP ${res.status}`);
      return res.json() as Promise<WalkGraphFile>;
    })
    .then(buildGraph)
    .catch((error: unknown) => {
      graphPromise = null; // 下次再試
      throw error;
    });
  return graphPromise;
}

export interface AudibleSignal {
  name: string;
  lat: number;
  lng: number;
}

/** 有聲號誌路口（全臺北約 190 處）。讀不到時回空陣列：導航照常，只是少了「聽嗶嗶聲」的提醒 */
export function loadAudibleSignals(): Promise<AudibleSignal[]> {
  signalsPromise ??= getOpenData("audible-signals", { limit: 1000 })
    .then((res) =>
      res.records.flatMap((r) => {
        const lat = Number(r.lat);
        const lng = Number(r.lng);
        const name = typeof r["路口"] === "string" ? signalName(r["路口"]) : "";
        return Number.isFinite(lat) && Number.isFinite(lng) && name ? [{ name, lat, lng }] : [];
      }),
    )
    .catch(() => {
      signalsPromise = null;
      return [];
    });
  return signalsPromise;
}

/** 預先載入（OfflineSupport 呼叫）；失敗不影響其他功能 */
export function preloadWalkData(): void {
  void loadWalkGraph().catch(() => {});
  void loadAudibleSignals();
}
