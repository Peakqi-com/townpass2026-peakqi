/**
 * M9 附近吃飯上課：把共餐、關懷據點、長青學苑、樂齡學習、老人服務中心五個開放資料集整理成同一種「地點」。
 * 規格見 docs/elder-mode-spec.md M9。
 *
 * 這些資料集都沒有座標，所以用台北通帳號裡的行政區（addresses[].town）篩選同一區，
 * 同一里的排在前面；長輩不用輸入地址。
 */
import { districtFromAddress, isTaipeiDistrict, type TaipeiDistrict } from "../opendata/normalize.ts";
import type { TownPassAccount } from "../townpass/types.ts";

export type CommunityCategoryId =
  | "meals"
  | "care"
  | "evergreen"
  | "lohas"
  | "service-center"
  // 照顧家人（/care）
  | "dementia"
  | "respite"
  | "caregiver"
  | "health-center"
  // 打疫苗、做篩檢（/health/places）
  | "flu"
  | "pneumococcal"
  | "cancer"
  | "denture";

/**
 * 怎麼找出「這一區」的地點：
 * - district（預設）：地點在這一區。代理用 q=行政區 篩選
 * - service-area：服務範圍包含這一區（「全區」或列出的行政區）。要抓全部再篩，因為「全區」的資料裡不會出現行政區名稱
 * - city：全市都列，同一區的排前面（例如全市只有 4 處的家庭照顧者服務中心）
 */
export type CategoryScope = "district" | "service-area" | "city";

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
  scope?: CategoryScope;
}

export const COMMUNITY_CATEGORIES: readonly CommunityCategory[] = [
  { id: "meals", label: "共餐", speak: "附近共餐的地方", description: "和鄰居一起吃飯的地方。", source: "elder-meals", owner: "臺北市政府社會局" },
  { id: "care", label: "關懷據點", speak: "社區照顧關懷據點", description: "社區裡的關懷據點，有健康課程，有的也有共餐。", source: "elder-care-points", owner: "臺北市政府社會局" },
  { id: "evergreen", label: "長青學苑", speak: "長青學苑，給長輩上課的地方", description: "給長輩上課的地方。", source: "elder-evergreen", owner: "臺北市政府社會局" },
  { id: "lohas", label: "樂齡學習", speak: "樂齡學習，學校和中心的長輩課程", description: "學校和樂齡中心開的長輩課程。", source: "elder-lohas", owner: "臺北市政府教育局" },
  // 說明取自社會局原頁（taipei-elderly-services.md 長者服務表「老人服務中心」✅）
  {
    id: "service-center",
    label: "老人服務中心",
    speak: "老人服務中心",
    description: "社會局委託或補助民間辦的長輩服務中心，週一到週五早上 8 點半到下午 5 點半。獨居長輩的緊急救援系統，也可以請這裡的社工幫忙申請。",
    source: "elder-service-centers",
    owner: "臺北市政府社會局",
  },
];

const HEALTH_CENTER: CommunityCategory = {
  id: "health-center",
  label: "健康服務中心",
  speak: "健康服務中心",
  description: "每一區都有一個健康服務中心。",
  source: "health-centers",
  owner: "臺北市政府衛生局",
};

/** 照顧家人（/care）：失智篩檢、喘息服務、照顧者支持、健康服務中心 */
export const CARE_CATEGORIES: readonly CommunityCategory[] = [
  {
    id: "dementia",
    label: "失智篩檢",
    speak: "失智症篩檢的醫院",
    description: "失智症篩檢、確診評估的合約醫院，全市 11 家。在這一區的排在前面。",
    source: "dementia-screening",
    owner: "臺北市政府衛生局",
    scope: "city",
  },
  {
    id: "respite",
    label: "喘息服務",
    speak: "喘息服務，讓照顧的家人休息",
    // 申請方式取自 subsidies.json 的 ltc-respite（1966 長照專線官方說明，2026-11-07 查證）
    description: "照顧的家人累了，可以請專人暫時接手。要先打 1966 申請，和長照服務一起評估。下面是服務範圍包含這一區的單位。",
    source: "ltc-respite-providers",
    owner: "臺北市政府衛生局",
    scope: "service-area",
  },
  {
    id: "caregiver",
    label: "照顧者支持",
    speak: "家庭照顧者服務中心",
    description: "給照顧家人的人的服務中心，全市 4 處。",
    source: "caregiver-centers",
    owner: "臺北市政府社會局",
    scope: "city",
  },
  HEALTH_CENTER,
];

/** 打疫苗、做篩檢（/health/places）：合約院所 */
export const HEALTH_PLACE_CATEGORIES: readonly CommunityCategory[] = [
  {
    id: "flu",
    label: "流感疫苗",
    speak: "可以打公費流感疫苗的院所",
    description: "公費流感疫苗的合約院所。去之前先打電話確認，記得帶健保卡。",
    source: "flu-vaccine-adult",
    owner: "臺北市政府衛生局",
  },
  {
    id: "pneumococcal",
    label: "肺炎鏈球菌疫苗",
    speak: "可以打公費肺炎鏈球菌疫苗的院所",
    description: "公費肺炎鏈球菌疫苗的合約院所。去之前先打電話確認。",
    source: "pneumococcal-vaccine",
    owner: "臺北市政府衛生局",
  },
  {
    id: "cancer",
    label: "癌症篩檢",
    speak: "可以做癌症篩檢的院所",
    // 後半句是資料集「貼心小提醒」欄位的原文
    description: "每一家可以做的篩檢不同，卡片上有寫。前往檢查時，建議先電洽醫療院所確認看診時段，並請攜帶健保卡。",
    source: "cancer-screening",
    owner: "臺北市政府衛生局",
  },
  {
    id: "denture",
    label: "假牙補助院所",
    speak: "申請假牙補助，先去做口腔檢查的醫院",
    // 申請流程取自 docs/taipei-subsidies.md A.12（社會局原頁，2026-11-07 查證）
    description: "低收、中低收入的長輩申請假牙補助，先到這些醫院做口腔檢查，由醫院送件。全市 6 處。",
    source: "denture-clinics",
    owner: "臺北市政府社會局",
    scope: "city",
  },
  HEALTH_CENTER,
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
  /** 服務範圍：全市（"all"）或列出的行政區；沒有就只看 district */
  serves?: "all" | TaipeiDistrict[];
}

/**
 * 結果的一句話，依篩選方式說清楚範圍：
 * 「中山區有 12 個共餐」「可以服務中山區的喘息服務有 180 個」「失智篩檢全市有 11 個，在中山區的排前面」
 */
export function resultSummary(category: CommunityCategory, district: TaipeiDistrict, count: number): string {
  switch (category.scope ?? "district") {
    case "city":
      return `${category.label}全市有 ${count} 個，在${district}的排前面`;
    case "service-area":
      return `可以服務${district}的${category.label}有 ${count} 個`;
    default:
      return `${district}有 ${count} 個${category.label}`;
  }
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
    case "service-center":
      name = str(record["中心名稱"]);
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
    case "dementia":
      name = str(record["醫院名稱"]);
      address = str(record["醫院地址"]);
      phoneRaw = withExtension(record["連絡電話"], record["分機"]);
      break;
    case "respite": {
      name = str(record["機構名稱"]);
      address = str(record["機構（服務）地址"]);
      phoneRaw = withExtension(record["市話"], record["分機"]) || str(record["行動電話"]);
      const area = str(record["服務區別"]);
      note = `${str(record.kind) === "居家式" ? "居家式（到家裡服務）" : str(record.kind)}。服務範圍：${area || "資料裡沒寫"}`;
      break;
    }
    case "caregiver":
      name = str(record["機構名稱"]);
      address = str(record["地址"]);
      phoneRaw = str(record["電話"]);
      break;
    case "health-center":
      name = str(record["健康服務中心名稱"]);
      address = str(record["地址"]);
      phoneRaw = str(record["電話"]);
      url = str(record["網址"]);
      break;
    case "flu":
    case "pneumococcal":
    case "denture":
      name = str(record["院所名稱"]);
      address = str(record["地址"]);
      phoneRaw = str(record["電話"]) || str(record["連絡電話"]);
      break;
    case "cancer": {
      name = str(record["院所名稱"]);
      address = str(record["地址"]);
      phoneRaw = str(record["聯絡電話"]);
      const kinds = CANCER_SCREENINGS.filter((k) => str(record[`${k}篩檢`]).toUpperCase() === "Y");
      note = kinds.length > 0 ? `可以做：${kinds.join("、")}篩檢` : "";
      break;
    }
  }
  const id =
    str(record["序號"]) || str(record["編號"]) || str(record["醫事機構代碼"]) || (category === "respite" ? str(record.kind) : "");
  const { phones, note: phoneNote } = parsePhones(phoneRaw);
  const district = isTaipeiDistrict(record.district) ? record.district : undefined;

  const place: CommunityPlace = { key: `${category}-${id}-${name}`, name, address, phones };
  if (district) place.district = district;
  if (phoneNote) place.phoneNote = phoneNote;
  if (note) place.note = note;
  if (/^https?:\/\//.test(url)) place.url = url;
  if (category === "respite") {
    const serves = parseServiceArea(record["服務區別"]);
    // 不在臺北市的單位（行政區域代碼 65000…）即使寫「全區」也不收
    if (serves && (serves !== "all" || district)) place.serves = serves;
  }
  if (category === "caregiver" || category === "dementia" || category === "denture") place.serves = "all";
  return place;
}

const CANCER_SCREENINGS = ["子宮頸癌", "口腔癌", "大腸癌", "乳癌", "肺癌"] as const;

/** 電話和分機分在兩欄時，接成 parsePhones 看得懂的「電話#分機」 */
function withExtension(phone: unknown, ext: unknown): string {
  const p = str(phone);
  const e = str(ext).replace(/\D/g, "");
  return p && e ? `${p}#${e}` : p;
}

/** 「服務區別」：「全區」→ "all"；「松山區、信義區」→ 行政區陣列；看不懂就回 undefined */
export function parseServiceArea(raw: unknown): "all" | TaipeiDistrict[] | undefined {
  const text = str(raw);
  if (text === "全區") return "all";
  const districts = text.split(/[、,，\s]+/).filter(isTaipeiDistrict);
  return districts.length > 0 ? districts : undefined;
}

/**
 * 只留這一區的地點：在這一區，或服務範圍包含這一區（serves）。
 * 排序：同一里 → 在這一區 → 其他（服務範圍包含這一區、或全市都列的）。
 * 代理的 q 會比對所有欄位，名稱裡有「中山區」的外區據點也會被找到，所以這裡要再用 district 篩一次。
 */
export function placesInDistrict(
  places: readonly CommunityPlace[],
  district: TaipeiDistrict,
  village?: string,
): (CommunityPlace & { sameVillage: boolean })[] {
  const inDistrict = (p: CommunityPlace) => p.district === district;
  return places
    .filter((p) => inDistrict(p) || p.serves === "all" || (Array.isArray(p.serves) && p.serves.includes(district)))
    .map((p) => ({ ...p, sameVillage: Boolean(village) && inDistrict(p) && p.address.includes(village!) }))
    .sort((a, b) => Number(b.sameVillage) - Number(a.sameVillage) || Number(inDistrict(b)) - Number(inDistrict(a)));
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
  for (const a of byPriority(user)) {
    const inTaipei = !a.city || CITY.test(a.city);
    if (inTaipei && isTaipeiDistrict(a.town)) return { district: a.town, village: a.village?.trim() || undefined };
  }
  if (CITY.test(user.residentAddress ?? "")) {
    const district = districtFromAddress(user.residentAddress);
    if (district) return { district, village: undefined };
  }
  return null;
}

/** 標記為主要的地址排前面 */
function byPriority(user: TownPassAccount) {
  return [...(user.addresses ?? [])].sort((a, b) => Number(Boolean(b.priority)) - Number(Boolean(a.priority)));
}

/** 住在哪一條路（例如「吉林路」），用來把同一條路上的地點排前面；不在臺北市或沒有資料時回 undefined */
export function userStreet(user: TownPassAccount | null): string | undefined {
  if (!user) return undefined;
  for (const a of byPriority(user)) {
    const inTaipei = !a.city || CITY.test(a.city);
    if (inTaipei && isTaipeiDistrict(a.town)) return a.street?.trim() || undefined;
  }
  return undefined;
}
