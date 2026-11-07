/**
 * M3 服務清單：跨局處整合的核心（規格見 docs/elder-mode-spec.md M3）。
 *
 * 資料在 src/data/services.json，設計成讓各局處自己維護自己那幾筆：
 * - phrases：長輩的說法，給「找服務」比對用（M2）
 * - action／fallback／alt_channels：按下去做什麼；聽障者用 alt_channels（文字管道）
 * - source、verified：官方出處與查證日期，畫面上會顯示
 * 規則由 services.test.ts 驗證（id 不重複、網址必須是 https、只能用講的服務一定要寫 alt_channels…）。
 */
import raw from "../../data/services.json" with { type: "json" };

export type Audience = "elder" | "vision" | "hearing";

export type Category = "health" | "ride" | "benefit" | "community" | "family" | "help" | "text" | "vision";

/** 動作只能是 App 既有或 M0 新增的 Handler，或站內頁面；長輩模式不自己發明動作 */
export type Action =
  | { type: "phone_call"; target: string; label?: string }
  | { type: "1999agree"; label?: string }
  | { type: "open_link"; target: string; label?: string }
  | { type: "open_external"; target: string; label?: string }
  | { type: "page"; target: string; label?: string };

export type AltChannel = Action & { label: string };

export interface Service {
  id: string;
  /** 卡片與按鈕上的名稱，1～8 個字 */
  title: string;
  /** 按下或找到時唸出的話 */
  speak: string;
  /** 一句話說明 */
  description: string;
  category: Category;
  phrases: string[];
  audience: Audience[];
  action: Action;
  /** 主要動作失敗或想改用電話時 */
  fallback?: Action;
  /** 不用講話的替代管道。主要動作是撥號的服務一定要寫（沒有就寫 []） */
  alt_channels?: AltChannel[];
  /** 撥號前顯示確認頁 */
  confirm?: boolean;
  owner: string;
  source: string;
  verified: string;
}

export const SERVICES: readonly Service[] = raw as Service[];

export function getService(id: string): Service | undefined {
  return SERVICES.find((s) => s.id === id);
}

/** 服務裡的撥號動作（主要動作優先，其次是 fallback）；沒有撥號回 null */
export function phoneOf(service: Service): Extract<Action, { type: "phone_call" }> | null {
  for (const action of [service.action, service.fallback]) {
    if (action?.type === "phone_call") return { type: "phone_call", target: action.target };
  }
  return null;
}

/** 把電話號碼排成好唸、好看的樣子：0221811995 → (02)2181-1995 */
export function formatPhone(number: string): string {
  if (/^0800\d{6}$/.test(number)) return `${number.slice(0, 4)}-${number.slice(4, 7)}-${number.slice(7)}`;
  if (/^02\d{8}$/.test(number)) return `(02)${number.slice(2, 6)}-${number.slice(6)}`;
  return number;
}
