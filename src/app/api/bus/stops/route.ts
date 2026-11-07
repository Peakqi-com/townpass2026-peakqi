import type { NextRequest } from "next/server";
import { directionsOf } from "@/lib/bus/bus.ts";
import { BUS_DATASETS, isBusCity, loadRoutes, loadStops } from "@/lib/bus/data.ts";

/**
 * 一條路線兩個方向的站牌（家人設定時用）：GET /api/bus/stops?city=tpe&route=16111
 */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const city = params.get("city");
  const routeId = Number(params.get("route"));
  if (!isBusCity(city) || !Number.isInteger(routeId) || routeId <= 0) {
    return Response.json({ error: "city 要是 tpe 或 ntpc，route 要是路線代碼" }, { status: 400 });
  }
  try {
    const route = (await loadRoutes(city)).find((r) => r.id === routeId);
    if (!route) return Response.json({ error: "找不到這條路線" }, { status: 404 });
    const directions = directionsOf(route, await loadStops(city)).map((d) => ({
      goBack: d.goBack,
      label: d.label,
      stops: d.stops.map(({ id, name, seq, lat, lng }) => ({ id, name, seq, lat, lng })),
    }));
    return Response.json(
      { source: BUS_DATASETS.stop, route, directions },
      { headers: { "Cache-Control": "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400" } },
    );
  } catch (error) {
    console.error("[bus] 站牌載入失敗：", error);
    return Response.json({ error: "公車資料暫時讀不到，請稍後再試" }, { status: 502 });
  }
}
