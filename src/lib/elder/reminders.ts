/**
 * 提醒（M6）：用 App 的 reminder Handler 排程本機通知，App 關掉也會跳出來。
 * 規則都在這裡，畫面只負責顯示與呼叫。臺灣沒有日光節約時間，一律用 +08:00。
 */

export interface Reminder {
  /** 小寫英數與 -；同一個 id 再設定會取代舊的（App 端規則） */
  id: string;
  /** 最多 40 字 */
  title: string;
  /** 最多 120 字 */
  body: string;
  /** ISO 8601，帶 +08:00 */
  at: string;
}

/** 提醒時間至少要在幾分鐘之後，太近的話排程前就過了 */
const MIN_LEAD_MS = 5 * 60 * 1000;

/**
 * 重陽禮金第二波申請的提醒：截止前一天（11/12）早上 9 點；已經過了就改成截止當天早上 9 點；
 * 都來不及就回傳 null（畫面不顯示提醒按鈕）。截止日 11/13 與 profile.ts 的 doubleNinthGift 相同（社會局公告）。
 */
export function giftReminder(now: Date): Reminder | null {
  const body = "還沒申請的話，打開台北通的「用得了」就能線上申請匯款，也可以到區公所申請。";
  const candidates = [
    { at: "2026-11-12T09:00:00+08:00", title: "重陽禮金明天截止" },
    { at: "2026-11-13T09:00:00+08:00", title: "重陽禮金今天截止" },
  ];
  const next = candidates.find((c) => new Date(c.at).getTime() - now.getTime() >= MIN_LEAD_MS);
  return next ? { id: "double-ninth-2026", title: next.title, body, at: next.at } : null;
}

const WEEKDAY = ["日", "一", "二", "三", "四", "五", "六"];

/** 「11 月 12 日（星期四）早上 9 點」：以臺北時間顯示 */
export function formatReminderTime(iso: string): string {
  const taipei = new Date(new Date(iso).getTime() + 8 * 60 * 60 * 1000);
  const hour = taipei.getUTCHours();
  const minute = taipei.getUTCMinutes();
  const period = hour < 12 ? "早上" : hour === 12 ? "中午" : hour < 18 ? "下午" : "晚上";
  const h12 = hour > 12 ? hour - 12 : hour;
  const time = minute === 0 ? `${h12} 點` : `${h12} 點 ${minute} 分`;
  return `${taipei.getUTCMonth() + 1} 月 ${taipei.getUTCDate()} 日（星期${WEEKDAY[taipei.getUTCDay()]}）${period} ${time}`;
}

/* ---------- 回診／領藥提醒（M4 看醫生 → 看完醫生之後） ---------- */

/** revisit＝回診；refill＝領慢性病連續處方箋的藥 */
export type FollowUpKind = "revisit" | "refill";

/** 按鈕上的字（畫面與報讀共用） */
export const FOLLOW_UP_LABEL: Readonly<Record<FollowUpKind, string>> = {
  revisit: "回診",
  refill: "領慢性病連續處方箋的藥",
};

const DAY_MS = 24 * 60 * 60 * 1000;
const TAIPEI_OFFSET_MS = 8 * 60 * 60 * 1000;
/** App 的 reminder Handler 最遠只接受 400 天之後 */
const MAX_DAYS_AHEAD = 400;

/** 某個時間點在臺北是哪一天（YYYY-MM-DD） */
function taipeiDate(ms: number): string {
  return new Date(ms + TAIPEI_OFFSET_MS).toISOString().slice(0, 10);
}

/** YYYY-MM-DD 而且是真的日期（擋掉 2 月 30 日之類），否則回 null */
function parseDay(date: string): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  const noon = Date.parse(`${date}T12:00:00+08:00`);
  return Number.isNaN(noon) || taipeiDate(noon) !== date ? null : noon;
}

/** 日期欄可以選的範圍：最早明天，最晚 400 天後（前一天晚上的提醒一定在 App 接受的範圍內） */
export function followUpDateRange(now: Date): { min: string; max: string } {
  return { min: taipeiDate(now.getTime() + DAY_MS), max: taipeiDate(now.getTime() + MAX_DAYS_AHEAD * DAY_MS) };
}

/** 「11 月 20 日（星期五）」：date 是 YYYY-MM-DD（臺北日期） */
export function formatDay(date: string): string {
  const [, month, day] = date.split("-").map(Number);
  const weekday = new Date(`${date}T12:00:00+08:00`).getUTCDay();
  return `${month} 月 ${day} 日（星期${WEEKDAY[weekday]}）`;
}

/**
 * 回診或領藥的提醒：前一天晚上 7 點；剩不到 5 分鐘就改成當天早上 7 點；都來不及回 null。
 * 日期格式不對、或超過 400 天（App 不接受）也回 null。
 *
 * 內文只提醒要帶的東西，不寫健保的領藥期限等規則（沒有查證健保署的官方頁面，不寫）。
 */
export function followUpReminder({ kind, date, now }: { kind: FollowUpKind; date: string; now: Date }): Reminder | null {
  const noon = parseDay(date);
  if (noon === null || date > followUpDateRange(now).max) return null;

  const what = kind === "revisit" ? "回診" : "領藥";
  const bring = kind === "revisit" ? "健保卡和藥袋" : "健保卡、慢性病連續處方箋和藥袋";
  const body = `${formatDay(date)}要${what}，記得帶${bring}。`;
  const candidates = [
    { at: `${taipeiDate(noon - DAY_MS)}T19:00:00+08:00`, title: `明天要${what}` },
    { at: `${date}T07:00:00+08:00`, title: `今天要${what}` },
  ];
  const next = candidates.find((c) => new Date(c.at).getTime() - now.getTime() >= MIN_LEAD_MS);
  if (!next) return null;
  return { id: `followup-${kind}-${date.replaceAll("-", "")}`, title: next.title, body, at: next.at };
}

/* ---------- 記住已經設定的提醒（只用來顯示「已設定」，不影響 App 端的通知） ---------- */

const STORE_KEY = "elder-reminders";

export function readSavedReminders(): Record<string, string> {
  try {
    const value = JSON.parse(window.localStorage.getItem(STORE_KEY) ?? "{}");
    return value && typeof value === "object" ? (value as Record<string, string>) : {};
  } catch {
    return {};
  }
}

export function saveReminder(id: string, at: string | null): void {
  try {
    const all = readSavedReminders();
    if (at) all[id] = at;
    else delete all[id];
    window.localStorage.setItem(STORE_KEY, JSON.stringify(all));
  } catch {
    // 存不了只影響「已設定」的顯示，通知本身已經排好
  }
}
