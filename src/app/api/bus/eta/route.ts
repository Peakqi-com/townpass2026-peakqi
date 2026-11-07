import type { NextRequest } from "next/server";
import { etaText, findEstimate, type BusTarget } from "@/lib/bus/bus.ts";
import { BUS_DATASETS, isBusCity, loadEstimates } from "@/lib/bus/data.ts";

const MAX_TARGETS = 4;

/**
 * 預估到站（長輩首頁用）：GET /api/bus/eta?t=tpe:16111:15276,ntpc:…
 * 每組是「市別:路線代碼:站牌代碼」，一次最多 4 組。只回傳這幾筆，不把整份 2 MB 的資料丟給手機。
 */
export async function GET(request: NextRequest) {
  const raw = (request.nextUrl.searchParams.get("t") ?? "").split(",").filter(Boolean);
  const targets: BusTarget[] = [];
  for (const item of raw.slice(0, MAX_TARGETS + 1)) {
    const [city, route, stop] = item.split(":");
    const routeId = Number(route);
    const stopId = Number(stop);
    if (!isBusCity(city) || !Number.isInteger(routeId) || routeId <= 0 || !Number.isInteger(stopId) || stopId <= 0) {
      return Response.json({ error: "格式要是 市別:路線代碼:站牌代碼" }, { status: 400 });
    }
    targets.push({ city, routeId, stopId });
  }
  if (targets.length === 0 || targets.length > MAX_TARGETS) {
    return Response.json({ error: `一次查 1～${MAX_TARGETS} 組` }, { status: 400 });
  }
  try {
    const cities = [...new Set(targets.map((t) => t.city))];
    const loaded = new Map(await Promise.all(cities.map(async (c) => [c, await loadEstimates(c)] as const)));
    const items = targets.map((t) => {
      const seconds = findEstimate(loaded.get(t.city)!.value, t);
      return { ...t, seconds: seconds ?? null, text: etaText(seconds) };
    });
    return Response.json(
      {
        source: BUS_DATASETS.estimate,
        checkedAt: new Date().toISOString(),
        stale: [...loaded.values()].some((l) => l.stale),
        items,
      },
      { headers: { "Cache-Control": "public, max-age=0, s-maxage=15, stale-while-revalidate=15" } },
    );
  } catch (error) {
    console.error("[bus] 預估到站載入失敗：", error);
    return Response.json({ error: "公車資料暫時讀不到，請稍後再試" }, { status: 502 });
  }
}
