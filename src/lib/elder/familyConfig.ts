/**
 * M7 家人代設定的設定碼（規格見 TownPass docs/townpass/elder-mode-spec.md M7）。
 *
 * 流程：家人的手機產生 QR code → 長輩的手機用 qr_code_scan 掃描 → 驗證 → 存在本機。
 * 設定內容直接編在 QR 裡，**不經過伺服器**。
 *
 * 格式（JSON，v＝版本號；之後改格式就升版本，舊版本的長輩手機會拒絕看不懂的碼）：
 *   { "kind": "elder-family", "v": 1,
 *     "buttons": ["health", "ride", "family", "community"],
 *     "contacts": [{ "name": "大兒子", "phone": "0912345678" }],
 *     "town": "中山區" }
 *
 * 安全：掃到的內容一律當成不可信（任何人都能印一張 QR 貼在公布欄）。
 * 先限制長度再解析；每個欄位都檢查型別與範圍；多出來的欄位直接丟掉，只存我們認得的欄位。
 */
import { HOME_BUTTONS, type HomeButton } from "./home.ts";

export const FAMILY_CONFIG_KIND = "elder-family";
export const FAMILY_CONFIG_VERSION = 1;

export const FAMILY_LIMITS = {
  /** 設定碼最長的字元數。最大的合法設定約 300 字，留一些餘裕 */
  maxInput: 1000,
  minButtons: 4,
  maxButtons: 6,
  minContacts: 1,
  maxContacts: 3,
  /** 聯絡人名稱最多幾個字（以字元計，中文一字算一個） */
  maxName: 10,
} as const;

/** 一定要有的按鈕：長輩要靠它打給家人，也要靠它重新掃描設定碼 */
export const REQUIRED_BUTTON = "family";

/** 臺北市 12 個行政區（依區碼排序） */
export const TAIPEI_TOWNS = [
  "中正區",
  "大同區",
  "中山區",
  "松山區",
  "大安區",
  "萬華區",
  "信義區",
  "士林區",
  "北投區",
  "內湖區",
  "南港區",
  "文山區",
] as const;

export type TaipeiTown = (typeof TAIPEI_TOWNS)[number];

export interface FamilyContact {
  /** 長輩看到的稱呼，例如「大兒子」 */
  name: string;
  /** 只有數字，3～15 碼 */
  phone: string;
}

export interface FamilyConfig {
  v: typeof FAMILY_CONFIG_VERSION;
  /** 首頁按鈕的 id（HOME_BUTTONS 裡的），照家人挑的順序 */
  buttons: string[];
  contacts: FamilyContact[];
  /** 長輩住的行政區，給附近據點等功能使用 */
  town: TaipeiTown;
}

export type CheckResult = { ok: true; config: FamilyConfig } | { ok: false; reason: string };

const BUTTON_IDS = new Set(HOME_BUTTONS.map((b) => b.id));
const PHONE = /^\d{3,15}$/;
// 控制字元（換行等）與格式字元（例如會讓文字反向顯示的 U+202E），可以用來假冒名稱
const HIDDEN_CHARS = /[\p{Cc}\p{Cf}]/u;

const isTown = (value: unknown): value is TaipeiTown =>
  typeof value === "string" && (TAIPEI_TOWNS as readonly string[]).includes(value);

const fail = (reason: string): CheckResult => ({ ok: false, reason });

/**
 * 檢查一位聯絡人。失敗原因是接在「第 N 位聯絡人」後面的半句話，
 * 家人那一端的表單也用它，才能說出是第幾列填錯。
 */
export function checkContact(
  value: unknown,
): { ok: true; contact: FamilyContact } | { ok: false; reason: string } {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return { ok: false, reason: "格式不對" };
  const { name, phone } = value as Record<string, unknown>;
  const trimmed = typeof name === "string" ? name.trim() : "";
  if (trimmed.length === 0) return { ok: false, reason: "要填稱呼" };
  if ([...trimmed].length > FAMILY_LIMITS.maxName) return { ok: false, reason: `的稱呼最多 ${FAMILY_LIMITS.maxName} 個字` };
  if (HIDDEN_CHARS.test(trimmed)) return { ok: false, reason: "的稱呼有不能用的字" };
  if (typeof phone !== "string" || !PHONE.test(phone)) return { ok: false, reason: "的電話要是 3～15 位數字" };
  return { ok: true, contact: { name: trimmed, phone } };
}

/**
 * 檢查一份設定是否合法，回傳整理過的設定（名稱去掉前後空白、只留認得的欄位），
 * 或給家人看的中文原因。家人那一端產生 QR 前、長輩那一端存檔前都用這個。
 */
export function checkFamilyConfig(value: unknown): CheckResult {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return fail("格式不對");
  const raw = value as Record<string, unknown>;
  if (raw.v !== FAMILY_CONFIG_VERSION) return fail("版本不對，請兩邊都更新台北通");

  const { buttons, contacts, town } = raw;
  const { minButtons, maxButtons, minContacts, maxContacts } = FAMILY_LIMITS;

  if (!Array.isArray(buttons) || !buttons.every((id) => typeof id === "string" && BUTTON_IDS.has(id))) {
    return fail("首頁按鈕不對");
  }
  if (buttons.length < minButtons || buttons.length > maxButtons) {
    return fail(`首頁按鈕要選 ${minButtons}～${maxButtons} 個`);
  }
  if (new Set(buttons).size !== buttons.length) return fail("首頁按鈕重複了");
  if (!buttons.includes(REQUIRED_BUTTON)) return fail("首頁一定要有「打給家人」");

  if (!Array.isArray(contacts) || contacts.length < minContacts || contacts.length > maxContacts) {
    return fail(`聯絡人要填 ${minContacts}～${maxContacts} 位`);
  }
  const cleanContacts: FamilyContact[] = [];
  for (const [i, contact] of contacts.entries()) {
    const result = checkContact(contact);
    if (!result.ok) return fail(`第 ${i + 1} 位聯絡人${result.reason}`);
    cleanContacts.push(result.contact);
  }

  if (!isTown(town)) return fail("請選長輩住的行政區");

  return { ok: true, config: { v: FAMILY_CONFIG_VERSION, buttons: [...buttons], contacts: cleanContacts, town } };
}

/** 設定 → 設定碼（放進 QR，也用同一個字串存在 localStorage） */
export function encodeFamilyConfig(config: FamilyConfig): string {
  const { v, buttons, contacts, town } = config;
  return JSON.stringify({
    kind: FAMILY_CONFIG_KIND,
    v,
    buttons,
    contacts: contacts.map(({ name, phone }) => ({ name, phone })),
    town,
  });
}

/** 設定碼 → 設定。任何不合法的內容（包括網址、別的 QR、被竄改的碼）都回傳 null */
export function decodeFamilyConfig(text: unknown): FamilyConfig | null {
  if (typeof text !== "string" || text.length === 0 || text.length > FAMILY_LIMITS.maxInput) return null;
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return null;
  }
  if (typeof raw !== "object" || raw === null || (raw as { kind?: unknown }).kind !== FAMILY_CONFIG_KIND) return null;
  const result = checkFamilyConfig(raw);
  return result.ok ? result.config : null;
}

/**
 * 家人輸入電話時的整理：全形數字轉半形，去掉空白、橫線、括號、點。
 * 只用在家人那一端的輸入框；掃到的設定碼不做整理，不合格就拒絕。
 */
export function normalizePhone(input: string): string {
  return input
    .replace(/[０-９]/g, (d) => String.fromCharCode(d.charCodeAt(0) - 0xfee0))
    .replace(/[\s\-－()（）.]/g, "");
}

/** 顯示用的電話：手機 0912 345 678、市話 (02)2345-6789，其他照原樣 */
export function formatMobile(phone: string): string {
  if (/^09\d{8}$/.test(phone)) return `${phone.slice(0, 4)} ${phone.slice(4, 7)} ${phone.slice(7)}`;
  if (/^02\d{8}$/.test(phone)) return `(02)${phone.slice(2, 6)}-${phone.slice(6)}`;
  return phone;
}

/** 首頁要顯示的按鈕：有家人設定時照家人挑的順序，沒有時用預設的 6 個 */
export function familyButtons(config: FamilyConfig | null): readonly HomeButton[] {
  if (!config) return HOME_BUTTONS;
  const picked = config.buttons
    .map((id) => HOME_BUTTONS.find((b) => b.id === id))
    .filter((b): b is HomeButton => b !== undefined);
  return picked.length > 0 ? picked : HOME_BUTTONS;
}
