import type { NextRequest } from "next/server";
import { loadWithCache } from "@/lib/opendata/cache.ts";
import { applyQuery, parseQuery } from "@/lib/opendata/query.ts";
import { getSource, LICENSE, SOURCES } from "@/lib/opendata/sources.ts";

/**
 * 開放資料代理：GET /api/opendata/<source>?near=lat,lng&radius=1000&limit=100&q=關鍵字
 *
 * - 只代理 sources.ts 白名單裡的來源（不接受任意網址）
 * - 處理 CORS、Big5、CSV/XML → JSON、TWD97 → WGS84
 * - Cache-Control 讓 CDN（Vercel）快取，s-maxage 依來源的更新頻率設定
 */
export async function GET(request: NextRequest, ctx: RouteContext<"/api/opendata/[source]">) {
  const { source: id } = await ctx.params;
  const source = getSource(id);
  if (!source) {
    return Response.json({ error: `沒有這個資料來源：${id}`, available: Object.keys(SOURCES) }, { status: 404 });
  }

  const query = parseQuery(request.nextUrl.searchParams);
  if ("error" in query) return Response.json({ error: query.error }, { status: 400 });
  if (query.near && !source.hasGeo) {
    return Response.json({ error: `${id} 沒有座標，不能使用 near 參數` }, { status: 400 });
  }

  try {
    const data = await loadWithCache(source);
    const { total, records } = applyQuery(data.records, query);
    return Response.json(
      {
        source: { id: source.id, title: source.title, url: source.datasetUrl, license: LICENSE },
        fetchedAt: data.fetchedAt,
        sourceUpdatedAt: data.sourceUpdatedAt ?? null,
        stale: data.stale,
        total,
        count: records.length,
        records,
      },
      {
        headers: {
          "Cache-Control": `public, max-age=0, s-maxage=${source.ttl}, stale-while-revalidate=${source.ttl * 5}`,
        },
      },
    );
  } catch (error) {
    console.error(`[opendata] ${id} 載入失敗：`, error);
    return Response.json({ error: "上游資料暫時無法取得，請稍後再試", source: source.datasetUrl }, { status: 502 });
  }
}
