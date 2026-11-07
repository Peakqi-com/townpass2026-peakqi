/**
 * 城市通 App ↔ 微服務網頁 雙向溝通
 *
 * 協定（見 TownPass lib/util/web_message_handler/）：
 *   網頁 → App：window.flutterObject.postMessage(JSON.stringify({ name, data }))
 *   App → 網頁：flutterObject 的 'message' 事件，event.data 是 JSON 字串 { name, data }
 *
 * 注意：
 * - 只能在瀏覽器端呼叫（'use client' 元件的 useEffect 或事件 handler 裡），SSR 階段沒有 window。
 * - 一般瀏覽器沒有 flutterObject，這時會改用 mock.ts 的假資料，方便在電腦上開發。
 * - 同一個 name 的請求不要同時發出，否則無法分辨回覆屬於哪個請求。
 */

import { mockAccount, mockPosition, mockQrCode } from "./mock.ts";
import type { TownPassAccount, TownPassPosition } from "./types.ts";

interface FlutterObject {
  postMessage(message: string): void;
  addEventListener(type: "message", listener: (event: MessageEvent<string>) => void): void;
  removeEventListener(type: "message", listener: (event: MessageEvent<string>) => void): void;
}

declare global {
  interface Window {
    flutterObject?: FlutterObject;
  }
}

type Reply<T> = { name: string; data: T };

/** 是否在城市通 App 的 WebView 裡執行 */
export function isInTownPass(): boolean {
  return typeof window !== "undefined" && typeof window.flutterObject !== "undefined";
}

/** 只送出、不等待回覆（例如 notify、open_link 成功時 App 不會回覆） */
export function postToApp(name: string, data: unknown = null): void {
  window.flutterObject?.postMessage(JSON.stringify({ name, data }));
}

/** 送出並等待同名的回覆 */
export function callApp<T>(name: string, data: unknown = null, timeoutMs = 10_000): Promise<T> {
  const fo = window.flutterObject;
  if (!fo) return Promise.reject(new Error(`不在城市通 App 內：${name}`));

  return new Promise<T>((resolve, reject) => {
    const onMessage = (event: MessageEvent<string>) => {
      let reply: Reply<T>;
      try {
        reply = JSON.parse(event.data);
      } catch {
        // DEBUG（暫時）：iOS 實機查掃碼問題用，查完移除
        postToApp(`debug-reply-unparsed:${typeof event.data}:${String(event.data).slice(0, 60)}`);
        return;
      }
      // DEBUG（暫時）
      postToApp(`debug-reply:${reply.name}:${typeof reply.data}`);
      if (reply.name !== name) return;
      cleanup();
      resolve(reply.data);
    };
    const timer = setTimeout(() => {
      cleanup();
      reject(new Error(`等待 App 回覆逾時：${name}`));
    }, timeoutMs);
    const cleanup = () => {
      clearTimeout(timer);
      fo.removeEventListener("message", onMessage);
    };

    fo.addEventListener("message", onMessage);
    fo.postMessage(JSON.stringify({ name, data }));
  });
}

// App 在失敗或沒有資料時會回 []，統一轉成 null
const emptyToNull = <T>(value: T | [] | null | undefined): T | null =>
  value == null || (Array.isArray(value) && value.length === 0) ? null : (value as T);

/* ---------- 內建能力 ---------- */

/** 取得使用者資料（App 端讀取 assets/mock_data/account.json） */
export async function getUserInfo(): Promise<TownPassAccount | null> {
  if (!isInTownPass()) return mockAccount;
  return emptyToNull(await callApp<TownPassAccount | []>("userinfo"));
}

/** 取得目前位置；沒有權限或失敗時回 null */
export async function getLocation(): Promise<TownPassPosition | null> {
  if (!isInTownPass()) return mockPosition;
  return emptyToNull(await callApp<TownPassPosition | []>("location", null, 20_000));
}

/** 取得裝置資訊 */
export async function getDeviceInfo(): Promise<Record<string, unknown> | null> {
  if (!isInTownPass()) return { platform: "browser", userAgent: navigator.userAgent };
  return emptyToNull(await callApp<Record<string, unknown> | []>("deviceinfo"));
}

/** 開啟 App 的掃碼頁，回傳掃到的字串；使用者直接返回時可能是 null */
export async function scanQrCode(): Promise<string | null> {
  if (!isInTownPass()) return mockQrCode;
  return callApp<string | null>("qr_code_scan", null, 120_000);
}

/**
 * 發送手機通知（成功時 App 不會回覆）
 * ⚠️ content 如果符合「已訂閱X」或「已取消訂閱X」，App 會順便改動訂閱清單。
 */
export function notify(title: string, content: string): void {
  if (!isInTownPass()) {
    console.info("[TownPass mock] notify", { title, content });
    return;
  }
  postToApp("notify", { title, content });
}

/** 在 App 內開新的 WebView 頁面（不要用 window.open，App 不支援彈出視窗） */
export function openLink(url: string): void {
  if (!isInTownPass()) {
    window.open(url, "_blank", "noopener");
    return;
  }
  postToApp("open_link", url);
}

/** 用外部 App 開啟地圖或網址，回傳是否能開啟 */
export async function launchMap(url: string): Promise<boolean> {
  if (!isInTownPass()) {
    window.open(url, "_blank", "noopener");
    return true;
  }
  return callApp<boolean>("launch_map", url);
}

/**
 * 撥打 1999。App 會先顯示同意條款（第一次）與「立即撥號」對話框，所以網頁不需要再做確認頁。
 * 成功時 App 不會回覆，所以不等待。
 */
export function call1999(): void {
  if (!isInTownPass()) {
    window.location.href = "tel:1999";
    return;
  }
  postToApp("1999agree", true);
}

/** 撥打電話，回傳是否能撥打 */
export async function phoneCall(phoneNumber: string): Promise<boolean> {
  if (!isInTownPass()) {
    window.location.href = `tel:${phoneNumber}`;
    return true;
  }
  return callApp<boolean>("phone_call", phoneNumber);
}
