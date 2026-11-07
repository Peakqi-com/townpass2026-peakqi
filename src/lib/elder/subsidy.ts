/**
 * M12 補助小幫手：資格規則（純函式，可以在 node --test 測試）。
 * 規格見 docs/elder-mode-spec.md M12；資料與出處見 taipei-subsidies.md。
 *
 * 資料在 src/data/subsidies.json，只放研究文件裡標 ✅ 的項目。市府調整資格或金額時只改 JSON。
 * 規則：
 * - 先問「幫誰看」：幫自己看時，年齡、原住民身分、是否為臺北市民從台北通帳號帶入，不問長輩。
 *   幫另一半或家人看時，改問對方的年紀（級距）；級距會影響結果時才問是不是原住民。
 *   行政區、市民身分沿用使用者的（假設住在同一戶，畫面上會寫出來）。
 * - 再問三題：身心障礙證明、家裡收入、家裡有沒有人需要照顧。每題都有「不知道」。
 * - 一律只說「可能可以申請」，最後由主責機關審核。答案只在手機的記憶體裡，不上傳。
 */
import raw from "../../data/subsidies.json" with { type: "json" };
import { formatPhone, getService, phoneOf, type AltChannel, type Service } from "./services.ts";

/* ---------- 型別 ---------- */

/** 第 1 題：有身心障礙證明嗎？有的話再問是哪一類 */
export type DisabilityAnswer = "vision" | "hearing" | "other" | "no" | "unknown";
/** 第 2 題：有低收或中低收證明／沒有，但收入不高／不知道 */
export type IncomeAnswer = "certified" | "notCertified" | "unknown";
/** 第 3 題：家裡有人需要別人照顧嗎？ */
export type CareAnswer = "yes" | "no" | "unknown";

export interface SubsidyAnswers {
  disability: DisabilityAnswer;
  income: IncomeAnswer;
  care: CareAnswer;
}

/** 要看的人：幫自己看時從台北通帳號帶入；幫家人看時用 personForOther() 產生 */
export interface SubsidyPerson {
  age: number | null;
  nativePeople: boolean;
  citizen: boolean;
  /** 幫家人看、原住民題答「不知道」：結果會提示「如果是原住民，還可能有…」 */
  nativeUnknown?: boolean;
}

/** 幫誰看 */
export type Who = "self" | "other";
/** 幫家人看時：是不是原住民 */
export type NativeAnswer = "yes" | "no" | "unknown";

/** 幫家人看時問的年紀範圍。min 含、max 不含；max 為 null 表示沒有上限 */
export interface AgeBracket {
  id: string;
  label: string;
  min: number;
  max: number | null;
}

/** 幫家人看時的回答（年紀級距的 id 或「不知道」） */
export interface OtherAnswers {
  age: string;
  native: NativeAnswer;
}

export interface SubsidyRule {
  /** 年齡要 ≥ 這個數字 */
  ageMin?: number;
  /** 原住民的年齡門檻（有寫才降） */
  ageMinNative?: number;
  /** 要有身心障礙證明 */
  disability?: boolean;
  /** 家裡要有人需要照顧（被照顧的人不一定是使用者本人，所以不看使用者的年齡） */
  needsCare?: boolean;
  /** 收入題的回答要在清單內；沒寫就是不限 */
  income?: IncomeAnswer[];
  /** 要審家庭收入與財產：沒有低收、中低收證明的人加註「要看家裡收入」 */
  meansTested?: boolean;
  /** 不用申請，會自動入帳或減免 */
  autoGranted?: boolean;
  /** 收入題是這些回答時，不用申請（例如已列冊的低收戶由社會局主動核發） */
  autoGrantedWhen?: IncomeAnswer[];
  /** 要設籍臺北市 */
  cityOnly?: boolean;
  /** 期限（YYYY-MM-DD，臺北時間），過了就不列 */
  validUntil?: string;
  /** 身障類別是這些時排前面 */
  boost?: Exclude<DisabilityAnswer, "no" | "unknown">[];
}

export interface SubsidyApply {
  /** district_social：戶籍地區公所社會課；any_district：任一區公所 */
  counter?: "district_social" | "any_district";
  /** 撥 1999 之後要轉的分機（1999 沒辦法自動撥分機，要長輩接通後說出來） */
  call1999?: string;
  /** 依行政區不同的 1999 分機 */
  call1999ByDistrict?: Record<string, string>;
  /** services.json 裡的服務 id（例如 ltc-1966、welfare-1957） */
  service?: string;
  /** 其他專線（撥號前一樣有確認頁） */
  phone?: { number: string; label: string };
  /** 確定能用的線上申請 */
  online?: { url: string; label: string };
  /** 怎麼申請，一兩句話 */
  how?: string;
  /** 不用申請時的說明 */
  autoNote?: string;
}

export interface Subsidy {
  id: string;
  title: string;
  /** 一句話說明 */
  summary: string;
  /** 大約金額 */
  amount: string;
  rule: SubsidyRule;
  /** 要準備什麼（勾選清單） */
  documents: string[];
  apply: SubsidyApply;
  /** 家人能不能代辦；null 表示官方頁面沒寫 */
  proxy: { allowed: boolean | null; bring: string[] };
  notes: string[];
  /** 只能擇優領一項的補助 */
  exclusiveWith?: string[];
  owner: string;
  source: string;
  verified: string;
}

export interface District {
  id: string;
  name: string;
  /** 總機（數字） */
  phone: string;
  /** 社會課的分機 */
  ext: string;
  address: string;
}

export interface SubsidyMatch {
  subsidy: Subsidy;
  /** 不用申請，會自動入帳或減免 */
  auto: boolean;
  /** 要注意的條件，例如「要看家裡收入」。越少越可能可以申請 */
  caveats: string[];
}

/**
 * 結果之外的提示：
 * - age：讀不到生日；notCitizen：不是臺北市民
 * - disability／care：這兩題答「不知道」，相關補助先不列，改用一句話說明
 * - native：幫家人看、不確定是不是原住民，而原住民還可能多幾項（列在 nativeExtra）
 */
export type SubsidyHint = "age" | "notCitizen" | "disability" | "care" | "native";

export interface SubsidyResult {
  /** 要申請的（依符合程度排序） */
  apply: SubsidyMatch[];
  /** 不用申請的 */
  auto: SubsidyMatch[];
  hints: SubsidyHint[];
  /** 如果是原住民，還可能多出來的補助名稱（只有 nativeUnknown 時才有） */
  nativeExtra: string[];
  /** services.json 裡相關的服務 id（例如看不清楚 → 視障生活重建） */
  related: string[];
}

interface SubsidyData {
  districtSource: string;
  districtVerified: string;
  districts: District[];
  related: Record<"vision" | "hearing" | "care", string[]>;
  subsidies: Subsidy[];
}

const DATA = raw as SubsidyData;

export const SUBSIDIES: readonly Subsidy[] = DATA.subsidies;
export const DISTRICTS: readonly District[] = DATA.districts;
export const RELATED: Readonly<SubsidyData["related"]> = DATA.related;
export const DISTRICT_SOURCE = DATA.districtSource;
export const DISTRICT_VERIFIED = DATA.districtVerified;

/** 頁面與準備單底部固定的一句話 */
export const REVIEW_NOTE = "最後由社會局審核，這裡只是幫您先看看。";

export const INCOME_CAVEAT = "要看家裡收入";

/* ---------- 資格判斷 ---------- */

function taipeiDateString(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Taipei", year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
}

function hasDisability(a: DisabilityAnswer): boolean {
  return a === "vision" || a === "hearing" || a === "other";
}

/** 單一補助是否可能可以申請（不含擇優領一項的附註） */
function check(s: Subsidy, person: SubsidyPerson, answers: SubsidyAnswers, today: string): SubsidyMatch | null {
  const r = s.rule;
  if (r.validUntil && today > r.validUntil) return null;
  if (r.cityOnly && !person.citizen) return null;
  if (r.ageMin !== undefined) {
    const min = person.nativePeople && r.ageMinNative !== undefined ? r.ageMinNative : r.ageMin;
    if (person.age === null || person.age < min) return null;
  }
  if (r.disability && !hasDisability(answers.disability)) return null;
  if (r.needsCare && answers.care !== "yes") return null;
  if (r.income && !r.income.includes(answers.income)) return null;

  const caveats: string[] = [];
  if (r.meansTested && answers.income !== "certified") caveats.push(INCOME_CAVEAT);
  const auto = Boolean(r.autoGranted || r.autoGrantedWhen?.includes(answers.income));
  return { subsidy: s, auto, caveats };
}

/**
 * 依台北通帳號與三題回答，列出「可能可以申請」的補助。
 * 排序：資格附註越少越前面（「只能選一項領」不算）；同樣多時，身障類別相關的（boost）在前；其餘照資料檔的順序。
 */
export function findSubsidies(person: SubsidyPerson, answers: SubsidyAnswers, today: Date): SubsidyResult {
  const date = taipeiDateString(today);
  const matches = SUBSIDIES.map((s) => check(s, person, answers, date)).filter((m): m is SubsidyMatch => m !== null);

  // 符合程度只看資格附註（例如「要看家裡收入」），不含下面「只能選一項領」的提醒
  const fit = new Map(matches.map((m) => [m.subsidy.id, m.caveats.length]));

  // 只能擇優領一項：兩項都列出時，兩張卡都提醒
  const titleOf = new Map(matches.map((m) => [m.subsidy.id, m.subsidy.title]));
  for (const m of matches) {
    for (const other of m.subsidy.exclusiveWith ?? []) {
      const title = titleOf.get(other);
      if (title) m.caveats.push(`和「${title}」只能選一項領`);
    }
  }

  const order = new Map(SUBSIDIES.map((s, i) => [s.id, i]));
  const boosted = (m: SubsidyMatch) => (m.subsidy.rule.boost?.some((b) => b === answers.disability) ? 0 : 1);
  const sorted = [...matches].sort(
    (a, b) =>
      fit.get(a.subsidy.id)! - fit.get(b.subsidy.id)! ||
      boosted(a) - boosted(b) ||
      order.get(a.subsidy.id)! - order.get(b.subsidy.id)!,
  );

  const hints: SubsidyHint[] = [];
  if (person.age === null) hints.push("age");
  if (!person.citizen) hints.push("notCitizen");
  if (answers.disability === "unknown") hints.push("disability");
  if (answers.care === "unknown") hints.push("care");

  // 不確定是不是原住民：算算看「如果是」會多哪幾項（不列進結果，只提示）
  const nativeExtra =
    person.nativeUnknown && !person.nativePeople
      ? SUBSIDIES.filter(
          (s) => check(s, { ...person, nativePeople: true }, answers, date) && !check(s, person, answers, date),
        ).map((s) => s.title)
      : [];
  if (nativeExtra.length > 0) hints.push("native");

  const related: string[] = [];
  if (answers.disability === "vision" || answers.disability === "hearing") related.push(...RELATED[answers.disability]);
  if (answers.care === "yes") related.push(...RELATED.care);

  return {
    apply: sorted.filter((m) => !m.auto),
    auto: sorted.filter((m) => m.auto),
    hints,
    nativeExtra,
    related,
  };
}

/* ---------- 幫另一半或家人看 ---------- */

/**
 * 年紀級距：用資料裡所有的年齡門檻（ageMin、ageMinNative）切出來，例如 55、65 →
 * 「未滿 55 歲」「55～64 歲」「65 歲以上」。級距的邊界就是門檻，同一個級距裡不會跨過任何門檻，
 * 所以用級距的下限判斷，結果和知道確切歲數時一樣。市府調整門檻時只改 JSON，級距會跟著變。
 */
export function ageBrackets(subsidies: readonly Subsidy[] = SUBSIDIES): AgeBracket[] {
  const thresholds = [
    ...new Set(subsidies.flatMap((s) => [s.rule.ageMin, s.rule.ageMinNative]).filter((n): n is number => n !== undefined)),
  ].sort((a, b) => a - b);
  if (thresholds.length === 0) return [];
  const brackets: AgeBracket[] = [{ id: `under-${thresholds[0]}`, label: `未滿 ${thresholds[0]} 歲`, min: 0, max: thresholds[0] }];
  thresholds.forEach((t, i) => {
    const next = thresholds[i + 1];
    brackets.push(
      next === undefined
        ? { id: `${t}-up`, label: `${t} 歲以上`, min: t, max: null }
        : { id: `${t}-${next - 1}`, label: `${t}～${next - 1} 歲`, min: t, max: next },
    );
  });
  return brackets;
}

export const AGE_BRACKETS: readonly AgeBracket[] = ageBrackets();

function bracketOf(id: string): AgeBracket | undefined {
  return AGE_BRACKETS.find((b) => b.id === id);
}

/**
 * 幫家人看時的「要看的人」：年紀用級距的下限，原住民用回答的；
 * 是否為臺北市民沿用使用者的（假設住在同一戶）。
 */
export function personForOther(a: OtherAnswers, citizen: boolean): SubsidyPerson {
  return {
    age: bracketOf(a.age)?.min ?? null,
    nativePeople: a.native === "yes",
    citizen,
    nativeUnknown: a.native === "unknown",
  };
}

/** 這個年紀級距，是不是原住民會影響結果？會的話才問（少問一題就少一題） */
export function nativeMatters(ageId: string): boolean {
  const b = bracketOf(ageId);
  if (!b) return false;
  return SUBSIDIES.some(
    ({ rule: r }) => r.ageMin !== undefined && r.ageMinNative !== undefined && (b.min >= r.ageMinNative) !== (b.min >= r.ageMin),
  );
}

/* ---------- 打電話時的第一句話 ---------- */

/** 在說誰：幫自己或幫家人；ageText 例如「72 歲」「65 歲以上」，不知道時 null */
export interface SubsidySubject {
  who: Who;
  ageText: string | null;
}

export function selfSubject(age: number | null): SubsidySubject {
  return { who: "self", ageText: age === null ? null : `${age} 歲` };
}

export function otherSubject(ageId: string): SubsidySubject {
  return { who: "other", ageText: bracketOf(ageId)?.label ?? null };
}

/** 這項補助有沒有電話可以問（區公所、1999 分機、1966／1957、專線） */
export function hasPhoneChannel(s: Subsidy): boolean {
  const a = s.apply;
  if (a.counter || a.call1999 || a.call1999ByDistrict || a.phone) return true;
  const service = a.service ? getService(a.service) : undefined;
  return Boolean(service && phoneOf(service));
}

/**
 * 打電話（或用文字問）時的第一句話：補助名稱＋住哪一區＋幾歲。
 * 幫家人問時一律說「我家人」，不猜是先生、太太還是爸媽。
 * 例：「您好，我想問「老人生活津貼」怎麼申請。我住在中山區，今年 72 歲。」
 */
export function callScript(s: Subsidy, subject: SubsidySubject, district: District | null): string {
  const ask =
    subject.who === "self" ? `您好，我想問「${s.title}」怎麼申請。` : `您好，我想幫我家人問「${s.title}」怎麼申請。`;
  const facts: string[] = [];
  if (district) facts.push(`住在${district.name}`);
  if (subject.ageText) facts.push(`今年${/^\d/.test(subject.ageText) ? " " : ""}${subject.ageText}`);
  if (facts.length === 0) return ask;
  return `${ask}${subject.who === "self" ? "我" : "我家人"}${facts.join("，")}。`;
}

/* ---------- 行政區與電話 ---------- */

/** 使用者的行政區：優先用標記為主要（priority）的地址，沒有就用第一筆 */
export function townOf(addresses: readonly { town: string; priority: boolean }[] | undefined): string | null {
  if (!addresses || addresses.length === 0) return null;
  return (addresses.find((a) => a.priority) ?? addresses[0]).town || null;
}

/** 依 userinfo.addresses[].town（例如「中山區」）找社會課；不是臺北市的行政區回 null */
export function districtFor(town: string | undefined | null): District | null {
  if (!town) return null;
  return DISTRICTS.find((d) => town.endsWith(d.name)) ?? null;
}

/** 社會課電話：(02)2503-1369 轉 524～530 */
export function districtPhoneText(d: District): string {
  return `${formatPhone(d.phone)} 轉 ${d.ext}`;
}

/** 這一項補助要撥 1999 轉的分機（依行政區不同的優先） */
export function ext1999(s: Subsidy, district: District | null): string | null {
  if (district && s.apply.call1999ByDistrict?.[district.name]) return s.apply.call1999ByDistrict[district.name];
  return s.apply.call1999 ?? null;
}

/** 撥號確認頁旁邊的文字管道：聽不清楚的人用文字問 1999 */
const TEXT_1999: AltChannel = { type: "page", target: "/text", label: "用文字問 1999" };

function districtTarget(d: District): Service {
  return {
    id: `district-${d.id}`,
    title: `${d.name}公所社會課`,
    speak: `打給${d.name}公所社會課`,
    description: `地址：${d.address}。接通後請說：轉分機 ${d.ext}。`,
    category: "benefit",
    phrases: [],
    audience: ["elder", "vision", "hearing"],
    action: { type: "phone_call", target: d.phone },
    alt_channels: [TEXT_1999],
    confirm: true,
    owner: `臺北市${d.name}公所`,
    source: DISTRICT_SOURCE,
    verified: DISTRICT_VERIFIED,
  };
}

function subsidyPhoneTarget(s: Subsidy, phone: NonNullable<SubsidyApply["phone"]>): Service {
  return {
    id: s.id,
    title: phone.label,
    speak: `打給${phone.label}`,
    description: s.apply.how ?? s.summary,
    category: "benefit",
    phrases: [],
    audience: ["elder", "vision", "hearing"],
    action: { type: "phone_call", target: phone.number },
    alt_channels: [TEXT_1999],
    confirm: true,
    owner: s.owner,
    source: s.source,
    verified: s.verified,
  };
}

/**
 * 補助小幫手可以撥的電話（12 區社會課、補助的專線），給 /benefits/call/[id] 撥號確認頁用。
 * 形狀和服務清單一樣，所以可以直接用共用的 CallConfirm。
 */
export function callTargets(): Service[] {
  return [
    ...DISTRICTS.map(districtTarget),
    ...SUBSIDIES.flatMap((s) => (s.apply.phone ? [subsidyPhoneTarget(s, s.apply.phone)] : [])),
  ];
}

export function callTargetFor(id: string): Service | undefined {
  return callTargets().find((t) => t.id === id);
}

/* ---------- 申請準備單 ---------- */

/** 準備單上「誰審核」：依主責機關 */
function reviewerOf(owner: string): string {
  if (owner.includes("社會局")) return "社會局";
  if (owner.includes("衛生局")) return "衛生局";
  if (owner.includes("稅捐")) return "稅捐處";
  return "主責機關";
}

/**
 * 產生一段純文字的「申請準備單」：要帶什麼、去哪裡、注意事項。
 * 給長輩或家人複製後貼到 LINE；不假設任何分享網址格式。
 */
export function prepSheet(
  match: SubsidyMatch,
  district: District | null,
  subject: SubsidySubject = { who: "self", ageText: null },
): string {
  const s = match.subsidy;
  const other = subject.who === "other";
  const lines: string[] = [`【申請準備單】${s.title}`];
  if (other) lines.push(`幫家人看的（${subject.ageText ?? "年紀不確定"}，當作和您住在同一戶）`);
  lines.push(s.summary, `大約金額：${s.amount}`, "");

  if (s.documents.length > 0) {
    lines.push("要帶的東西：", ...s.documents.map((d) => `□ ${d}`), "");
  }

  if (s.proxy.allowed === true) {
    const intro = other
      ? s.proxy.bring.length > 0
        ? "可以幫家人代辦，代辦的人另外要帶："
        : "可以幫家人代辦。"
      : s.proxy.bring.length > 0
        ? "家人可以代辦，另外要帶："
        : "家人可以代辦。";
    lines.push(intro, ...s.proxy.bring.map((d) => `□ ${d}`), "");
  } else if (s.proxy.allowed === null) {
    lines.push("家人能不能代辦：官方頁面沒寫，請先打電話問。", "");
  }

  lines.push("去哪裡申請：");
  if (s.apply.how) lines.push(s.apply.how);
  if (s.apply.counter) {
    if (district) {
      if (s.apply.counter === "any_district") lines.push("離您家近的：");
      lines.push(`${district.name}公所社會課`, `地址：${district.address}`, `電話：${districtPhoneText(district)}`);
    } else {
      lines.push(s.apply.counter === "any_district" ? "任何一個區公所都可以辦。" : "戶籍所在地的區公所社會課");
    }
  }
  const ext = ext1999(s, district);
  if (ext) lines.push(`也可以打 1999，接通後請說：轉分機 ${ext}`);
  const service = s.apply.service ? getService(s.apply.service) : undefined;
  const servicePhone = service && phoneOf(service);
  if (service && servicePhone) lines.push(`${service.title}：${formatPhone(servicePhone.target)}`);
  if (s.apply.phone) lines.push(`${s.apply.phone.label}：${formatPhone(s.apply.phone.number)}`);
  if (s.apply.online) lines.push(`${s.apply.online.label}：${s.apply.online.url}`);
  if (hasPhoneChannel(s)) lines.push(`打電話時可以先說：${callScript(s, subject, district)}`);
  lines.push("");

  const notes = [...match.caveats, ...s.notes];
  if (notes.length > 0) lines.push("注意：", ...notes.map((n) => `・${n}`), "");

  lines.push(
    `最後由${reviewerOf(s.owner)}審核，這裡只是幫您先看看。`,
    `主責機關：${s.owner}`,
    `官方說明：${s.source}（${s.verified} 查證）`,
  );
  return lines.join("\n");
}
