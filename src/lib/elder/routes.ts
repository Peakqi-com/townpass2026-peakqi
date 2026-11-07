import { SERVICES, phoneOf } from "./services.ts";
import { callTargets } from "./subsidy.ts";

/**
 * 長輩模式的所有功能頁面（不含開發用的 /dev）。新增頁面時要加在這裡，
 * routes.test.ts 會檢查每個路徑都有對應的 page.tsx。
 */
export const PAGE_ROUTES = [
  "/",
  "/mode",
  "/find",
  "/health",
  "/ride",
  "/benefits",
  "/benefits/subsidy",
  "/family",
  "/family/setup",
  "/text",
  "/help",
  "/antifraud",
  "/card/clinic",
  "/community",
  "/vision",
  "/shelter",
  "/care",
  "/health/places",
  "/walk",
  "/nearby",
] as const;

/**
 * 有網路時要先預載的頁面：所有功能頁面，加上每個撥號確認頁。
 *
 * Next.js 只會預載畫面上看得到的連結；斷網後點到還沒預載的頁面就開不了。
 * 一打開服務就全部預載，之後斷網（評審可能關掉網路測試）還是可以在各頁之間切換。
 * 需要開放資料的清單（附近據點、捷運）斷網時仍然讀不到，畫面會說明。
 */
export function offlineRoutes(): string[] {
  const calls = SERVICES.filter((s) => phoneOf(s)).map((s) => `/call/${s.id}`);
  const benefitCalls = callTargets().map((t) => `/benefits/call/${t.id}`);
  return [...new Set<string>([...PAGE_ROUTES, ...calls, ...benefitCalls])];
}
