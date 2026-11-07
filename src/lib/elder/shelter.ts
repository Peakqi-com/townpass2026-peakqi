/**
 * 颱風、地震時去哪裡：依台北通帳號的「里」找出負責的避難收容處所。
 *
 * 資料：data.taipei〈臺北市可供避難收容處所一覽表〉（教育局，115 年版，419 處），
 * 經 /api/opendata/shelters 整理（.ods → 物件、拿掉個人姓名與電話、補上 district）。
 * 「服務里別」列出每一處負責哪些里，所以長輩不用輸入地址。
 * 「水災」「震災」的值是「是」「否」「備用」，照原文顯示，不自己解釋「備用」的意思。
 */
import { isTaipeiDistrict, type TaipeiDistrict } from "../opendata/normalize.ts";

export type HazardFlag = "是" | "否" | "備用" | "";
export type Hazard = "flood" | "quake";

export interface Shelter {
  key: string;
  name: string;
  /** 完整地址（補上臺北市與行政區），給畫面和地圖搜尋用 */
  address: string;
  district: TaipeiDistrict;
  /** 這一處負責的里 */
  serves: string[];
  flood: HazardFlag;
  quake: HazardFlag;
  accessible: boolean;
  indoor: boolean;
}

const str = (v: unknown): string => (typeof v === "string" ? v.trim() : "");
const flag = (v: unknown): HazardFlag => {
  const s = str(v);
  return s === "是" || s === "否" || s === "備用" ? s : "";
};

/** 代理回傳的一筆資料 → Shelter；沒有名稱或不在臺北市的回 null */
export function toShelter(record: Record<string, unknown>): Shelter | null {
  const name = str(record["名稱(學校機關全銜)"]);
  const district = record.district;
  if (!name || !isTaipeiDistrict(district)) return null;
  const street = str(record["門牌地址"]);
  const address = /^(臺北市|台北市)/.test(street) ? street : `臺北市${district}${street}`;
  return {
    key: str(record["收容所編號"]) || name,
    name,
    address,
    district,
    serves: str(record["服務里別"]).split(/[、,，\s]+/).filter(Boolean),
    flood: flag(record["水災"]),
    quake: flag(record["震災"]),
    accessible: str(record["無障礙設施"]) === "是",
    indoor: str(record["室內"]) === "是",
  };
}

const RANK: Record<HazardFlag, number> = { 是: 0, 備用: 1, 否: 2, "": 3 };

/**
 * 找出這一區的避難收容處所：負責這個里的（mine）和同區其他的（others）。
 * 有選災害時，只留「是」或「備用」，「是」排前面；同一級裡有無障礙設施的排前面，
 * 再來是和長輩家同一條路的（資料沒有座標，用台北通帳號的 street 判斷遠近）。
 */
export function sheltersFor(
  shelters: readonly Shelter[],
  opts: { district: TaipeiDistrict; village: string | undefined; hazard: Hazard | null; street?: string },
): { mine: Shelter[]; others: Shelter[] } {
  const { district, village, hazard } = opts;
  const street = opts.street?.trim();
  const usable = (s: Shelter) => !hazard || s[hazard] === "是" || s[hazard] === "備用";
  const sameStreet = (s: Shelter) => Boolean(street) && s.address.includes(street!);
  const rank = (s: Shelter) => ((hazard ? RANK[s[hazard]] : 0) * 2 + (s.accessible ? 0 : 1)) * 2 + (sameStreet(s) ? 0 : 1);
  const inDistrict = shelters.filter((s) => s.district === district && usable(s)).sort((a, b) => rank(a) - rank(b));
  const isMine = (s: Shelter) => Boolean(village) && s.serves.includes(village!);
  return { mine: inDistrict.filter(isMine), others: inDistrict.filter((s) => !isMine(s)) };
}

/** 「水災」「震災」欄位的值，換成長輩聽得懂的說法 */
export function hazardLabel(value: HazardFlag): string {
  return value === "是" ? "可以收容" : value === "備用" ? "備用" : value === "否" ? "不適用" : "資料裡沒寫";
}

export const HAZARDS: readonly { id: Hazard; label: string; speak: string }[] = [
  { id: "flood", label: "颱風、淹水", speak: "颱風、淹水的時候" },
  { id: "quake", label: "地震", speak: "地震的時候" },
];
