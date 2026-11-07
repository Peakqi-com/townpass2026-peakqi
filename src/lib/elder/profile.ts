/**
 * 長輩模式的個人化邏輯（純函式，不碰 window，可以在 node --test 測試）。
 * 日期一律以臺北時間判斷。
 */

export type ElderMode = "normal" | "hearing" | "vision";

const MODES: readonly ElderMode[] = ["normal", "hearing", "vision"];

/** 從 localStorage 讀到的字串轉成模式；不認得就回 null（視為還沒選過） */
export function parseMode(value: string | null): ElderMode | null {
  return MODES.includes(value as ElderMode) ? (value as ElderMode) : null;
}

/* ---------- 唸的速度 ---------- */

export type SpeechRate = "slow" | "normal" | "fast" | "fastest";

const RATES: readonly SpeechRate[] = ["slow", "normal", "fast", "fastest"];

/**
 * 傳給 App speak Handler 的 rate（flutter_tts：0.5 約為正常語速，1.0 是上限）。
 * 長輩需要慢；視障者習慣用一般 3～5 倍的速度聆聽，所以要能調快。
 * 實際能多快依手機的 TTS 引擎而定，iOS 的上限可能達不到 3 倍。
 */
export const RATE_VALUE: Readonly<Record<SpeechRate, number>> = {
  slow: 0.4,
  normal: 0.5,
  fast: 0.75,
  fastest: 1,
};

export const RATE_LABEL: Readonly<Record<SpeechRate, string>> = {
  slow: "慢",
  normal: "正常",
  fast: "快",
  fastest: "最快",
};

export function parseRate(value: string | null): SpeechRate | null {
  return RATES.includes(value as SpeechRate) ? (value as SpeechRate) : null;
}

/** 沒有自己調過語速時的預設值：看不清楚模式用正常速度，其他用慢速 */
export function defaultRate(mode: ElderMode | null): SpeechRate {
  return mode === "vision" ? "normal" : "slow";
}

/* ---------- 日期 ---------- */

interface Ymd {
  y: number;
  m: number;
  d: number;
}

/** 某個時間點在臺北的年月日 */
function taipeiYmd(date: Date): Ymd {
  const [y, m, d] = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Taipei",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
    .format(date)
    .split("-")
    .map(Number);
  return { y, m, d };
}

function taipeiHour(date: Date): number {
  return Number(
    new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Taipei", hour: "2-digit", hourCycle: "h23" }).format(date),
  );
}

/** 解析城市通帳號的生日（yyyy/MM/dd），不存在的日期回 null */
function parseBirthday(birthday: string): Ymd | null {
  const match = /^(\d{4})\/(\d{2})\/(\d{2})$/.exec(birthday);
  if (!match) return null;
  const [y, m, d] = match.slice(1).map(Number);
  const check = new Date(Date.UTC(y, m - 1, d));
  if (check.getUTCFullYear() !== y || check.getUTCMonth() !== m - 1 || check.getUTCDate() !== d) return null;
  return { y, m, d };
}

/** 兩個日曆日之間差幾天（b − a） */
function daysBetween(a: Ymd, b: Ymd): number {
  return Math.round((Date.UTC(b.y, b.m - 1, b.d) - Date.UTC(a.y, a.m - 1, a.d)) / 86_400_000);
}

/** 依生日算出 today 當天的實歲；生日格式錯誤回 null */
export function ageOn(birthday: string, today: Date): number | null {
  const b = parseBirthday(birthday);
  if (!b) return null;
  const t = taipeiYmd(today);
  const hadBirthday = t.m > b.m || (t.m === b.m && t.d >= b.d);
  return t.y - b.y - (hadBirthday ? 0 : 1);
}

/** 依臺北時間的時段問候：05–10 早安、11–17 午安、18 點以後晚安；凌晨也說早安 */
export function greetingFor(now: Date): "早安" | "午安" | "晚安" {
  const hour = taipeiHour(now);
  if (hour >= 18) return "晚安";
  if (hour >= 11) return "午安";
  return "早安";
}

/* ---------- 重陽敬老禮金（115 年） ---------- */

export interface GiftPerson {
  birthday: string;
  /** 是否為臺北市民（userinfo.citizen） */
  citizen: boolean;
  /** 是否為原住民（userinfo.nativePeople），年齡門檻各降 10 歲 */
  nativePeople: boolean;
}

export interface GiftInfo {
  amount: 1500 | 3000 | 10000;
  /** apply：還在申請期內；reissue：申請期已過，只能申請補發 */
  phase: "apply" | "reissue";
  /** 距離截止還有幾天（當天截止為 0） */
  daysLeft: number;
}

/**
 * 臺北市重陽敬老禮金，規則取自社會局 115 年公告：
 * https://dosw.gov.taipei/cp.aspx?n=2AD02270ED65CBDD（2026-11-07 查證）
 * - 當年 12/31 前滿 65～84 歲 1,500 元、85～98 歲 3,000 元、99 歲以上 1 萬元（另有禮品）
 * - 原住民年齡門檻各降 10 歲
 * - 第二波線上或紙本申請：11/13 前；之後到 12/31 前可以申請補發
 *
 * 只是幫長輩「先看看」，最後以社會局審核為準（設籍時間等條件 App 無法判斷）。
 * 規則每年調整，所以只在 115 年（2026）回傳結果，其他年份回 null，避免顯示過期的金額。
 */
export function doubleNinthGift(person: GiftPerson, today: Date): GiftInfo | null {
  const RULE_YEAR = 2026;
  const t = taipeiYmd(today);
  if (t.y !== RULE_YEAR || !person.citizen) return null;

  const b = parseBirthday(person.birthday);
  if (!b) return null;

  const ageAtYearEnd = RULE_YEAR - b.y;
  const offset = person.nativePeople ? 10 : 0;
  let amount: GiftInfo["amount"];
  if (ageAtYearEnd >= 99 - offset) amount = 10000;
  else if (ageAtYearEnd >= 85 - offset) amount = 3000;
  else if (ageAtYearEnd >= 65 - offset) amount = 1500;
  else return null;

  const applyDeadline = { y: RULE_YEAR, m: 11, d: 13 };
  const reissueDeadline = { y: RULE_YEAR, m: 12, d: 31 };
  const toApply = daysBetween(t, applyDeadline);
  if (toApply >= 0) return { amount, phase: "apply", daysLeft: toApply };
  return { amount, phase: "reissue", daysLeft: daysBetween(t, reissueDeadline) };
}
