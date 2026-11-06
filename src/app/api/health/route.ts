import { connection } from "next/server";

/**
 * 健康檢查／後端範例。
 * 開啟 cacheComponents 時，GET Route Handler 預設會在 build 階段預先渲染。
 * 這裡呼叫 connection() 強制每次請求才執行，回傳的時間才會是即時的。
 */
export async function GET() {
  await connection();
  return Response.json({ status: "ok", time: new Date().toISOString() });
}
