/**
 * 長輩模式專用的 App 能力（對應 TownPass lib/util/web_message_handler/elder_mode_message_handlers.dart）。
 * 規格見 docs/elder-mode-spec.md 的 M0。
 *
 * 和 bridge.ts 一樣，只能在瀏覽器端呼叫。一般瀏覽器（不在城市通 App 內）時，
 * 會盡量用瀏覽器本身的功能代替，方便在電腦上開發。
 */

import { callApp, isInTownPass, postToApp } from "./bridge.ts";

/* ---------- a11y_state：螢幕閱讀器與系統字級 ---------- */

export interface A11yState {
  /** VoiceOver／TalkBack 是否開啟。開啟時網頁不要自己唸，避免重複播報 */
  screenReader: boolean;
  /** 系統字級倍率，1 表示預設 */
  textScale: number;
}

const DEFAULT_A11Y: A11yState = { screenReader: false, textScale: 1 };

/**
 * 取得系統的無障礙狀態。App 沒有這個 Handler（例如舊版城市通）時會逾時，
 * 這時回傳預設值，不讓頁面卡住。
 */
export async function getA11yState(timeoutMs = 1500): Promise<A11yState> {
  if (!isInTownPass()) return DEFAULT_A11Y;
  try {
    const state = await callApp<Partial<A11yState> | null>("a11y_state", null, timeoutMs);
    return {
      screenReader: state?.screenReader === true,
      textScale: typeof state?.textScale === "number" ? state.textScale : 1,
    };
  } catch {
    return DEFAULT_A11Y;
  }
}

/** 依系統字級算出根字級百分比，限制在 100%～300%（不縮小、也不大到破版） */
export function rootFontSizePercent(textScale: number): number {
  if (!Number.isFinite(textScale)) return 100;
  return Math.min(300, Math.max(100, Math.round(textScale * 100)));
}

/**
 * 套用系統字級。城市通的 WebView 不會跟著系統字級放大（Android 固定 textZoom=100，
 * iOS 不跟隨 Dynamic Type），所以由網頁設定根字級；全站字級都要用 rem。
 */
export function applyTextScale(textScale: number): void {
  document.documentElement.style.fontSize = `${rootFontSizePercent(textScale)}%`;
}

/* ---------- speak：唸出文字 ---------- */

/**
 * 用手機的系統 TTS 唸出文字（離線可用，需要中文語音包）。
 * 呼叫前請先確認螢幕閱讀器沒有開啟（getA11yState）。
 * 一般瀏覽器改用 speechSynthesis（只供開發測試；Android WebView 不支援）。
 */
export async function speak(text: string, rate?: number): Promise<boolean> {
  if (!isInTownPass()) {
    if (typeof speechSynthesis === "undefined") return false;
    speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "zh-TW";
    speechSynthesis.speak(utterance);
    return true;
  }
  return callApp<boolean>("speak", rate === undefined ? { text } : { text, rate });
}

/* ---------- haptic：震動回饋 ---------- */

/** 震動回饋。iOS WebView 不支援 navigator.vibrate，所以交給 App。不等待回覆 */
export function haptic(kind: "light" | "medium" = "light"): void {
  if (!isInTownPass()) {
    navigator.vibrate?.(kind === "medium" ? 30 : 10);
    return;
  }
  postToApp("haptic", kind);
}

/* ---------- open_external：用外部 App 開啟 ---------- */

/**
 * 用外部 App 開啟連結（LINE、簡訊、電話、Email），回傳是否成功。
 * App 只允許 https、tel、sms、mailto。
 */
export async function openExternal(url: string): Promise<boolean> {
  if (!isInTownPass()) {
    window.open(url, "_blank", "noopener");
    return true;
  }
  return callApp<boolean>("open_external", url);
}

/* ---------- reminder：排程本機通知 ---------- */

export interface ReminderRequest {
  id: string;
  title: string;
  body: string;
  /** ISO 8601，一定要帶時區（例如 +08:00） */
  at: string;
}

/** App 端錯誤代碼：forbidden、bad_request、past、too_far、permission_denied；網頁端另有 not_in_app、no_reply */
export type ReminderResult = { ok: true } | { ok: false; error: string };

/** 在指定時間跳出手機通知（App 關掉也會跳）。只有長輩模式的網域可以用 */
export async function setReminder(reminder: ReminderRequest): Promise<ReminderResult> {
  if (!isInTownPass()) return { ok: false, error: "not_in_app" };
  try {
    const reply = await callApp<{ status?: string; error?: string } | null>("reminder", { action: "set", ...reminder });
    if (reply?.status === "scheduled") return { ok: true };
    return { ok: false, error: reply?.error ?? "no_reply" };
  } catch {
    // App 沒有這個 Handler（舊版城市通）會逾時
    return { ok: false, error: "no_reply" };
  }
}

export async function cancelReminder(id: string): Promise<boolean> {
  if (!isInTownPass()) return false;
  try {
    const reply = await callApp<{ status?: string } | null>("reminder", { action: "cancel", id });
    return reply?.status === "cancelled";
  } catch {
    return false;
  }
}

/* ---------- listen：裝置端語音辨識 ---------- */

export interface ListenHandlers {
  /** App 已經開始收音 */
  onListening?: () => void;
  /** 辨識完成 */
  onText: (text: string) => void;
  /**
   * 失敗。常見代碼：
   * - not_in_app：不在城市通 App 內
   * - offline_unavailable：手機不支援離線辨識（為了遵守裝置端規則，不會改用雲端）
   * - forbidden：網域不在 App 的信任清單
   * - permission_denied：使用者沒有允許麥克風
   * 其他代碼來自系統辨識引擎，例如 error_no_match。
   * 收到任何錯誤時，畫面都應該改成請長輩打字或點選。
   */
  onError: (code: string) => void;
}

export interface ListenSession {
  /** 結束收音（放開按鈕、或再點一下）。之後仍會收到 onText 或 onError */
  stop: () => void;
  /** 取消（例如滑出按鈕）。之後不會再收到任何回呼 */
  cancel: () => void;
}

/**
 * 開始語音辨識。App 會先回覆 { status: 'listening' }，辨識完成回覆 { text }，
 * 失敗回覆 { error }。因為會連續收到多則回覆，不能用 callApp。
 */
export function startListening(handlers: ListenHandlers, locale = "zh-TW"): ListenSession {
  const fo = typeof window === "undefined" ? undefined : window.flutterObject;
  if (!fo) {
    handlers.onError("not_in_app");
    return { stop: () => {}, cancel: () => {} };
  }

  let done = false;
  const finish = () => {
    if (done) return;
    done = true;
    fo.removeEventListener("message", onMessage);
  };

  function onMessage(event: MessageEvent<string>) {
    let reply: { name?: string; data?: { status?: string; text?: unknown; error?: unknown } };
    try {
      reply = JSON.parse(event.data);
    } catch {
      return;
    }
    if (reply.name !== "listen" || done) return;

    const data = reply.data ?? {};
    if (typeof data.text === "string") {
      finish();
      handlers.onText(data.text);
    } else if (typeof data.error === "string") {
      finish();
      handlers.onError(data.error);
    } else if (data.status === "listening") {
      handlers.onListening?.();
    }
  }

  fo.addEventListener("message", onMessage);
  fo.postMessage(JSON.stringify({ name: "listen", data: { action: "start", locale } }));

  return {
    stop: () => {
      if (!done) postToApp("listen", { action: "stop" });
    },
    cancel: () => {
      if (done) return;
      finish();
      postToApp("listen", { action: "cancel" });
    },
  };
}
