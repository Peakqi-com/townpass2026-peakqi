import type { NextRequest } from "next/server";
import { searchRoutes } from "@/lib/bus/bus.ts";
import { BUS_CITIES, BUS_DATASETS, loadRoutes } from "@/lib/bus/data.ts";

/**
 * 用名稱找公車路線（家人設定時用）：GET /api/bus/routes?q=307
 * 臺北、新北兩份路線資料都找；名稱完全相同的排第一，其次是開頭相同的（searchRoutes）。
 */
export async function GET(request: NextRequest) {
  const q = (request.nextUrl.searchParams.get("q") ?? "").trim();
  if (!q || [...q].length > 10) return Response.json({ error: "請輸入路線名稱（10 個字以內）" }, { status: 400 });
  try {
    const all = (await Promise.all(BUS_CITIES.map((city) => loadRoutes(city)))).flat();
    return Response.json(
      { source: BUS_DATASETS.route, routes: searchRoutes(all, q) },
      { headers: { "Cache-Control": "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400" } },
    );
  } catch (error) {
    console.error("[bus] 路線載入失敗：", error);
    return Response.json({ error: "公車資料暫時讀不到，請稍後再試" }, { status: 502 });
  }
}
