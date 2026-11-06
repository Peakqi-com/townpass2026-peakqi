/**
 * 程序內快取：同一個執行個體在 TTL 內重複使用資料
 *
 * 為什麼不用 'use cache'：Next.js 預設把它存在記憶體，在 Vercel 這類 serverless 環境
 * 不保證跨請求共用（見 node_modules/next/dist/docs 的 use-cache「Runtime caching considerations」）。
 * 這裡用最單純的 Map，在 Vercel 與 Cloud Run 都能運作；跨執行個體的共用交給 CDN（route 回應的 Cache-Control）。
 *
 * - 同時多個請求只會打一次上游（in-flight 去重）
 * - 上游失敗時，若有舊資料就回傳舊資料並標記 stale，服務不會因為上游暫時掛掉而中斷
 */
import type { LoadResult, OpenDataSource } from "./sources.ts";

export interface CachedResult extends LoadResult {
  fetchedAt: string;
  stale: boolean;
}

const cache = new Map<string, { at: number; value: CachedResult }>();
const inflight = new Map<string, Promise<CachedResult>>();

export async function loadWithCache(source: OpenDataSource): Promise<CachedResult> {
  const hit = cache.get(source.id);
  if (hit && Date.now() - hit.at < source.ttl * 1000) return hit.value;

  const running = inflight.get(source.id);
  if (running) return running;

  const task = (async () => {
    try {
      const result = await source.load();
      const value: CachedResult = { ...result, fetchedAt: new Date().toISOString(), stale: false };
      cache.set(source.id, { at: Date.now(), value });
      return value;
    } catch (error) {
      if (hit) {
        console.warn(`[opendata] ${source.id} 上游失敗，回傳舊資料：`, error);
        return { ...hit.value, stale: true };
      }
      throw error;
    } finally {
      inflight.delete(source.id);
    }
  })();

  inflight.set(source.id, task);
  return task;
}
