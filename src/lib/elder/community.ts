/**
 * M9 附近吃飯上課：把共餐、關懷據點、長青學苑、樂齡學習四個開放資料集整理成同一種「地點」。
 * 規格見 TownPass docs/townpass/elder-mode-spec.md M9。
 *
 * 這些資料集都沒有座標，所以用台北通帳號裡的行政區（addresses[].town）篩選同一區，
 * 同一里的排在前面；長輩不用輸入地址。
 */
import { districtFromAddress, isTaipeiDistrict, type TaipeiDistrict } from "../opendata/normalize.ts";
import type { TownPassAccount } from "../townpass/types.ts";

export type CommunityCategoryId = "meals" | "care" | "evergreen" | "lohas";

export interface CommunityCategory {
  id: CommunityCategoryId;
  /** 按鈕上的字 */
  label: string;
  /** 按下時唸出的話 */
  speak: string;
  /** 一句話說明 */
  description: string;
  /** 開放資料代理的來源 id（src/lib/opendata/sources.ts） */
  source: string;
  /** 資料提供機關 */
  owner: string;
}

export const COMMUNITY_CATEGORIES: readonly CommunityCategory[] = [
  { id: "meals", label: "共餐", speak: "附近共餐的地方", description: "和鄰居一起吃飯的地方。", source: "elder-meals", owner: "臺北市政府社會局" },
  { id: "care", label: "關懷據點", speak: "社區照顧關懷據點", description: "社區裡的關懷據點，有健康課程，有的也有共餐。", source: "elder-care-points", owner: "臺北市政府社會局" },
  { id: "evergreen", label: "長青學苑", speak: "長青學苑，給長輩上課的地方", description: "給長輩上課的地方。", source: "elder-evergreen", owner: "臺北市政府社會局" },
  { id: "lohas", label: "樂齡學習", speak: "樂齡學習，學校和中心的長輩課程", description: "學校和樂齡中心開的長輩課程。", source: "elder-lohas", owner: "臺北市政府教育局" },
];

export interface Phone {
  /** 撥號用的數字，例如 0228369493 */
  dial: string;
  /** 顯示用，例如 (02)2836-9493 */
  display: string;
  /** 分機（撥號時不帶，接通後再說） */
  ext?: string;
}

export interface CommunityPlace {
  key: string;
  name: string;
  address: string;
  district?: TaipeiDistrict;
  phones: Phone[];
  /** 電話欄位不是號碼時的原文，例如「俟福國社宅完工後開辦」 */
  phoneNote?: string;
  /** 附帶說明，例如關懷據點的類型 */
  note?: string;
  url?: string;
}

/** 電話號碼排成好看、好唸的樣子 */
export function formatPhoneDigits(digits: string): string {
  if (/^0800\d{6}$/.test(digits)) return `${digits.slice(0, 4)}-${digits.slice(4, 7)}-${digits.slice(7)}`;
  if (/^02\d{8}$/.test(digits)) return `(02)${digits.slice(2, 6)}-${digits.slice(6)}`;
  if (/^09\d{8}$/.test(digits)) return `${digits.slice(0, 4)}-${digits.slice(4)}`;
  return digits;
}

const EXTENSION = /^(.*?)\s*(?:#|＃|分機|轉|\*|ext\.?)\s*(\d+)\s*$/i;

/**
 * 把開放資料的電話欄位拆成可以撥的號碼。
 * 寫法很多：02-28369493、(02)27685636、02-28381571#253、2831-6115轉251（沒有區碼）、兩支電話用換行或「/」分隔。
 * 分機不放進撥號字串（各家手機對「,」暫停的支援不一），改成在確認頁提示「接通後請說分機」。
 */
export function parsePhones(raw: unknown): { phones: Phone[]; note?: string } {
  if (typeof raw !== "string" || raw.trim() === "") return { phones: [] };
  const text = raw.trim();
  const phones: Phone[] = [];
  for (const part of text.split(/\s*[、/;；，,]\s*/)) {
    const m = part.match(EXTENSION);
    let dial = (m ? m[1] : part).replace(/\D/g, "");
    if (/^\d{7,8}$/.test(dial)) dial = "02" + dial; // 臺北市話沒寫區碼
    else if (/^9\d{8}$/.test(dial)) dial = "0" + dial; // 手機少了開頭的 0（918124780）
    if (!/^0\d{8,9}$/.test(dial)) continue;
    const ext = m?.[2];
    if (phones.some((p) => p.dial === dial && p.ext === ext)) continue;
    phones.push(ext ? { dial, display: formatPhoneDigits(dial), ext } : { dial, display: formatPhoneDigits(dial) });
  }
  return phones.length > 0 ? { phones } : { phones, note: text };
}

const str = (v: unknown): string => (typeof v === "string" ? v.trim() : "");

/** 各資料集的欄位名稱不同，整理成同一種地點 */
export function toCommunityPlace(category: CommunityCategoryId, record: Record<string, unknown>): CommunityPlace {
  let name: string;
  let address: string;
  let phoneRaw: string;
  let note = "";
  let url = "";
  switch (category) {
    case "meals":
      name = str(record["據點名稱"]);
      address = str(record["據點地址"]);
      phoneRaw = str(record["聯絡電話"]);
      break;
    case "care":
      name = str(record["據點名稱"]);
      address = str(record["地址"]);
      phoneRaw = str(record["電話"]);
      note = str(record["據點類型"]);
      break;
    case "evergreen":
      name = str(record["機構名稱"]);
      address = str(record["地址"]);
      phoneRaw = str(record["電話"]);
      break;
    case "lohas": {
      const school = str(record["辦理學校"]);
      name = school ? `${school}${str(record.kind) || "樂齡學堂"}` : str(record["樂齡中心名稱"]);
      address = str(record["地址"]);
      phoneRaw = str(record["民眾洽詢電話"]) || str(record["電話"]);
      url = str(record["網址"]);
      break;
    }
  }
  const id = str(record["序號"]) || str(record["編號"]);
  const { phones, note: phoneNote } = parsePhones(phoneRaw);
  const district = isTaipeiDistrict(record.district) ? record.district : undefined;

  const place: CommunityPlace = { key: `${category}-${id}-${name}`, name, address, phones };
  if (district) place.district = district;
  if (phoneNote) place.phoneNote = phoneNote;
  if (note) place.note = note;
  if (/^https?:\/\//.test(url)) place.url = url;
  return place;
}

/**
 * 只留同一區的地點，同一里的排前面。
 * 代理的 q 會比對所有欄位，名稱裡有「中山區」的外區據點也會被找到，所以這裡要再用 district 篩一次。
 */
export function placesInDistrict(
  places: readonly CommunityPlace[],
  district: TaipeiDistrict,
  village?: string,
): (CommunityPlace & { sameVillage: boolean })[] {
  return places
    .filter((p) => p.district === district)
    .map((p) => ({ ...p, sameVillage: Boolean(village) && p.address.includes(village!) }))
    .sort((a, b) => Number(b.sameVillage) - Number(a.sameVillage));
}

const CITY = /^(臺北市|台北市)/;

/**
 * 給地圖搜尋用的地址：只取第一個地點、去掉括號說明、里、郵遞區號，並補上「臺北市○○區」。
 * 有的據點一格寫了兩個地址（「…3號1樓；永康街60號4樓」），也有地址沒寫行政區的。
 *
 * OpenStreetMap 在臺灣幾乎查不到門牌（2026-11-07 實測「臺北市中山區林森北路62號」查無結果），
 * 但查得到路、段、巷，所以只搜到「巷」為止，去掉弄和門牌；完整地址仍顯示在畫面上。
 */
export function mapSearchAddress(place: Pick<CommunityPlace, "address" | "district">): string {
  let a = place.address.replace(/[（(][^）)]*[）)]/g, "").replace(/\s+/g, "");
  const upToNumber = a.match(/^[^；;，,]*?號/);
  a = upToNumber ? upToNumber[0] : a.split(/[；;，,、]/)[0];
  a = a
    .replace(/^\d{3,6}/, "") // 開頭的郵遞區號
    .replace(/^(臺北市|台北市)\d{3,6}/, "$1") // 縣市後面的郵遞區號
    .replace(/(區)[一-鿿]{1,3}里(?=[一-鿿])/, "$1") // 里名（地圖查不到）
    .replace(/\d+弄.*$/, "") // 弄以後
    .replace(/[\d\-之、]+號.*$/, ""); // 門牌（含「43、45、47號」「166-1號」「31之1號」）

  const district = place.district;
  if (!CITY.test(a)) return `臺北市${district && !a.includes(district) ? district : ""}${a}`;
  if (district && !a.includes(district)) {
    // 有寫臺北市但沒寫（或寫錯）行政區，例如「臺北市內區大湖山莊街」
    return a.replace(/^(臺北市|台北市)(?:[\u4e00-\u9fff]{1,2}區)?/, `臺北市${district}`);
  }
  return a;
}

/** 「怎麼去」：用 OpenStreetMap 搜尋（禁止 Google Maps） */
export function osmSearchUrl(place: Pick<CommunityPlace, "address" | "district">): string {
  return "https://www.openstreetmap.org/search?query=" + encodeURIComponent(mapSearchAddress(place));
}

/** 從台北通帳號找出住在臺北市哪一區、哪一里；不是臺北市或沒有地址時回 null（讓長輩自己選） */
export function userHome(user: TownPassAccount | null): { district: TaipeiDistrict; village: string | undefined } | null {
  if (!user) return null;
  const addresses = [...(user.addresses ?? [])].sort((a, b) => Number(Boolean(b.priority)) - Number(Boolean(a.priority)));
  for (const a of addresses) {
    const inTaipei = !a.city || CITY.test(a.city);
    if (inTaipei && isTaipeiDistrict(a.town)) return { district: a.town, village: a.village?.trim() || undefined };
  }
  if (CITY.test(user.residentAddress ?? "")) {
    const district = districtFromAddress(user.residentAddress);
    if (district) return { district, village: undefined };
  }
  return null;
}
