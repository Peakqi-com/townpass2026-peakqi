/**
 * M8 聽不清楚：產生簡訊與申請文字的純函式（規格見 TownPass docs/townpass/elder-mode-spec.md M8）。
 *
 * - 119 簡訊範本照臺北市消防局〈聽語障人士 119 緊急報案服務宣導單〉的三種範本（火災、受傷受困、生病）：
 *   「求救！我是○○○，男（女），○○歲，發生火災了，在○○（詳細地址）的地方，身穿○○顏色的衣服，請救我！」
 * - 110 沒有官方範本，沿用同樣的格式，畫面上要說明是我們整理的。
 * - 手語翻譯申請文字的格式是我們整理的，承辦單位可能會再問細節。
 *
 * 這裡只產生文字，**不會送出**。送出一律由使用者在簡訊 App 裡自己按。
 */

export type EmergencyKind = "fire" | "injury" | "sick" | "police";
export type Gender = "男" | "女";

export interface LatLng {
  latitude: number;
  longitude: number;
}

const BLANK = "（請填寫）";

function clean(value: string | null | undefined): string {
  return (value ?? "").trim();
}

/** 用生日（yyyy/MM/dd，城市通帳號的格式）算足歲；格式不對回 null */
export function ageOn(birthday: string, now: Date): number | null {
  const m = /^(\d{4})[/-](\d{1,2})[/-](\d{1,2})$/.exec(clean(birthday));
  if (!m) return null;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  let age = now.getFullYear() - y;
  if (now.getMonth() + 1 < mo || (now.getMonth() + 1 === mo && now.getDate() < d)) age -= 1;
  return age >= 0 && age < 150 ? age : null;
}

/** 身分證字號第 2 碼：1 是男、2 是女。其他格式（例如新式居留證號）不猜，回 null */
export function genderFromIdNo(idNo: string): Gender | null {
  const m = /^[A-Za-z]([12])\d{8}$/.exec(clean(idNo));
  if (!m) return null;
  return m[1] === "1" ? "男" : "女";
}

/** 經緯度寫成「北緯 25.03750，東經 121.56370」（小數 5 位約 1 公尺）；值不合理回 null */
export function formatPosition(pos: LatLng | null | undefined): string | null {
  if (!pos) return null;
  const { latitude, longitude } = pos;
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  if (Math.abs(latitude) > 90 || Math.abs(longitude) > 180) return null;
  const lat = `${latitude >= 0 ? "北緯" : "南緯"} ${Math.abs(latitude).toFixed(5)}`;
  const lng = `${longitude >= 0 ? "東經" : "西經"} ${Math.abs(longitude).toFixed(5)}`;
  return `${lat}，${lng}`;
}

/** 手機號碼排成好看的樣子：0911511902 → 0911-511-902；其他號碼原樣 */
export function formatMobile(number: string): string {
  return /^09\d{8}$/.test(number) ? `${number.slice(0, 4)}-${number.slice(4, 7)}-${number.slice(7)}` : number;
}

export interface EmergencySmsInput {
  kind: EmergencyKind;
  name?: string | null;
  gender?: Gender | null;
  age?: number | null;
  /** 使用者自己填的地址或地標 */
  address?: string | null;
  /** 手機定位 */
  position?: LatLng | null;
  /** 衣服顏色或其他特徵（受傷、生病時讓消防人員認人） */
  clothing?: string | null;
}

const SITUATION: Record<EmergencyKind, string> = {
  fire: "發生火災了",
  injury: "受傷了",
  sick: "生病了",
  police: "需要警察協助",
};

/** 依消防局範本產生 119（或 110）簡訊內容 */
export function build119Sms(input: EmergencySmsInput): string {
  const name = clean(input.name);
  const identity = [
    name ? `我是${name}` : "",
    input.gender ?? "",
    typeof input.age === "number" ? `${input.age}歲` : "",
  ].filter(Boolean);

  const address = clean(input.address);
  const gps = formatPosition(input.position);
  let place: string;
  if (address && gps) place = `${address}（GPS ${gps}）`;
  else if (address) place = address;
  else if (gps) place = ` GPS ${gps} `;
  else place = "（請填寫地址）";

  const clothing = clean(input.clothing);
  const parts = [
    ...identity,
    SITUATION[input.kind],
    `在${place}的地方`,
    ...(clothing && input.kind !== "fire" ? [`身穿${clothing}`] : []),
  ];
  const ending = input.kind === "police" ? "請幫我！" : "請救我！";
  return `求救！${parts.join("，")}，${ending}`;
}

/**
 * 開啟簡訊 App 的網址（只開啟、不送出）。
 * `?&body=` 是 Android 與 iOS 都能讀到內文的寫法；⚠️ 仍要用實機確認。
 */
export function smsUri(number: string, body: string): string {
  return `sms:${number.replace(/\D/g, "")}?&body=${encodeURIComponent(body)}`;
}

/* ---------- 日期 ---------- */

function parseDate(date: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(clean(date));
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return Number.isNaN(d.getTime()) ? null : d;
}

/** 給 <input type="date"> 用的日期字串（YYYY-MM-DD，本地時間） */
export function dateInputValue(now: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

const WEEKDAYS = ["星期日", "星期一", "星期二", "星期三", "星期四", "星期五", "星期六"];

/** YYYY-MM-DD → 星期幾 */
export function weekdayZh(date: string): string | null {
  const d = parseDate(date);
  return d ? WEEKDAYS[d.getDay()] : null;
}

/** 距離今天幾天（今天是 0、明天是 1、昨天是 -1）。用本地日期計算，不受時分影響 */
export function daysFromToday(date: string, now: Date): number | null {
  const d = parseDate(date);
  if (!d) return null;
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((d.getTime() - today.getTime()) / 86_400_000);
}

/**
 * 手語翻譯原則上要在 3 日前申請，緊急案件不在此限（社會局）。
 * 不到 3 天只提醒、不擋；沒問題回 null。
 */
export function leadTimeNotice(date: string, now: Date): string | null {
  const days = daysFromToday(date, now);
  if (days === null) return "請選日期。";
  if (days < 0) return "這一天已經過了，請重新選日期。";
  if (days < 3) return "離現在不到 3 天。原則上要 3 天前申請；緊急的話還是可以先問問看。";
  return null;
}

/* ---------- 手語翻譯、同步聽打申請文字 ---------- */

export interface InterpreterRequestInput {
  service: "手語翻譯" | "同步聽打";
  name?: string | null;
  phone?: string | null;
  /** YYYY-MM-DD */
  date: string;
  /** HH:mm */
  time?: string | null;
  place: string;
  purpose: string;
}

/** 產生傳給承辦單位的申請文字（LINE、簡訊都可以貼） */
export function buildInterpreterRequest(input: InterpreterRequestInput): string {
  const name = clean(input.name);
  const phone = clean(input.phone);
  const date = clean(input.date);
  const weekday = weekdayZh(date);
  const time = clean(input.time);
  const dateLine = date ? `${date}${weekday ? `（${weekday}）` : ""}${time}` : BLANK;

  return [
    `您好，我想申請${input.service}服務。`,
    `姓名：${name || BLANK}`,
    ...(phone ? [`聯絡手機：${formatMobile(phone)}`] : []),
    `日期：${dateLine}`,
    `地點：${clean(input.place) || BLANK}`,
    `事由：${clean(input.purpose) || BLANK}`,
    "謝謝！",
  ].join("\n");
}
