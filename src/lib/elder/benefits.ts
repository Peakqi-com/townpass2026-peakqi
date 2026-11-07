/**
 * M6 我的權益：依台北通帳號的生日、市民、原住民身分，主動列出長輩可以用的權益（純函式）。
 * 規格見 TownPass docs/townpass/elder-mode-spec.md M6；事實出處見 taipei-elderly-services.md B.1、B.5、B.7。
 *
 * 只是幫長輩「先看看」，最後以主責機關審核為準。
 *
 * 排序：最上面放「很多人不知道的權益」（老人健保費補助、長照交通接送、照顧家人）；
 * 重陽禮金、敬老卡幾乎每位長輩都知道，重陽禮金改成寫給「還沒收到」的人。
 * 依據見 TownPass docs/townpass/research-basis.md §0.2（畫面上不放調查的百分比）。
 */
import { ageOn, doubleNinthGift, type GiftInfo, type GiftPerson } from "./profile.ts";
import { SUBSIDIES, type Subsidy } from "./subsidy.ts";

export type BenefitPerson = GiftPerson;

export interface ElderBenefits {
  /** 實歲；生日讀不到時是 null */
  age: number | null;
  /** 敬老卡、疫苗、健檢的年齡門檻：65 歲，原住民 55 歲 */
  seniorAge: 55 | 65;
  isSenior: boolean;
  /** 重陽禮金（沿用 profile.ts 的規則） */
  gift: GiftInfo | null;
  /** 敬老愛心卡：設籍臺北市、65 歲以上（原住民 55 歲以上） */
  seniorCard: boolean;
  /** 公費流感、新冠、肺炎鏈球菌疫苗：65 歲以上（原住民 55 歲以上），全國都有，不看市民 */
  vaccine: boolean;
  /** 老人健檢：設籍臺北市、65 歲以上（原住民 55 歲以上），每年 1 月預約 */
  healthCheck: HealthCheckTiming | null;
  /** 很多人不知道的權益：65 歲以上（原住民 55 歲以上）才列；未滿年齡是 null */
  lesserKnown: LesserKnown | null;
}

export interface LesserKnown {
  /** 老人健保費補助（subsidies.json 的 elder-nhi-premium）：設籍臺北市才列 */
  nhiPremium: Subsidy | null;
  /** 長照交通接送（services.json 的 ltc-ride）：臺北市社會局的服務，設籍臺北市才列 */
  ltcRide: boolean;
  /** 照顧家人（/care）：給照顧另一半或家人的人，都列 */
  care: boolean;
}

export { GIFT_TITLE, giftAmountLine } from "./giftCopy.ts";

const NHI_PREMIUM = SUBSIDIES.find((s) => s.id === "elder-nhi-premium") ?? null;

/** 老人健保費補助的年齡門檻直接用 subsidies.json 的規則，不另外寫死 */
function nhiPremiumFor(age: number, person: BenefitPerson): Subsidy | null {
  if (!NHI_PREMIUM) return null;
  const r = NHI_PREMIUM.rule;
  if (r.cityOnly && !person.citizen) return null;
  const min = person.nativePeople && r.ageMinNative !== undefined ? r.ageMinNative : (r.ageMin ?? 0);
  return age >= min ? NHI_PREMIUM : null;
}

export interface HealthCheckTiming {
  /** 下一次可以預約的年份（西元） */
  year: number;
  rocYear: number;
  /** 現在就是 1 月（預約的月份） */
  inJanuary: boolean;
}

/** 臺北時間的年、月 */
function taipeiYearMonth(date: Date): { y: number; m: number } {
  const [y, m] = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Taipei", year: "numeric", month: "2-digit" })
    .format(date)
    .split("-")
    .map(Number);
  return { y, m };
}

/**
 * 老人健檢每年 1 月開放預約（115 年：優先族群 1/15–1/19、一般長者 1/22–1/27，額滿為止）。
 * 1 月時回傳今年；其他月份回傳明年 1 月。
 */
export function healthCheckTiming(today: Date): HealthCheckTiming {
  const { y, m } = taipeiYearMonth(today);
  const year = m === 1 ? y : y + 1;
  return { year, rocYear: year - 1911, inJanuary: m === 1 };
}

export function elderBenefits(person: BenefitPerson, today: Date): ElderBenefits {
  const age = ageOn(person.birthday, today);
  const seniorAge = person.nativePeople ? 55 : 65;
  const isSenior = age !== null && age >= seniorAge;
  return {
    age,
    seniorAge,
    isSenior,
    gift: doubleNinthGift(person, today),
    seniorCard: isSenior && person.citizen,
    vaccine: isSenior,
    healthCheck: isSenior && person.citizen ? healthCheckTiming(today) : null,
    lesserKnown:
      isSenior && age !== null
        ? { nhiPremium: nhiPremiumFor(age, person), ltcRide: person.citizen, care: true }
        : null,
  };
}
