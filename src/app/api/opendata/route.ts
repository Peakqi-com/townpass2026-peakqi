import { LICENSE, SOURCES } from "@/lib/opendata/sources.ts";

/** GET /api/opendata：列出所有可用的資料來源（不會打上游，build 時就能預先產生） */
export async function GET() {
  return Response.json({
    license: LICENSE,
    usage: "/api/opendata/<id>?near=緯度,經度&radius=公尺&limit=筆數&q=關鍵字",
    sources: Object.values(SOURCES).map(({ id, title, datasetUrl, ttl, hasGeo }) => ({ id, title, url: datasetUrl, ttl, hasGeo })),
  });
}
