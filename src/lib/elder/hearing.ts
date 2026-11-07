/**
 * M8 聽不清楚的資料：文字聯絡管道、119／110 簡訊號碼、求助卡、看診問答卡。
 *
 * 號碼、時段、網址只用 TownPass 研究文件標 ✅ 的資料：
 * - docs/taipei-disability-services.md B.1（1999 文字與手語視訊、119／110 簡訊、手語翻譯與聽打、VRS）
 * - docs/taipei-subsidies.md B.2（1957 線上文字諮詢）
 * 能按的動作（線上申辦、VRS、1957 網站）放在 services.json，這裡用 serviceId 連過去，
 * 由 useRunAction 執行，不在元件裡直接呼叫 bridge。
 *
 * 求助卡、看診問答卡的文字是**預先寫好的固定內容**（README 要說明），不是 AI 產生的。
 */

export interface Source {
  label: string;
  url: string;
  /** 查證日期 YYYY-MM-DD */
  verified: string;
}

export interface Contact {
  /** 例如「LINE ID」「簡訊」 */
  label: string;
  /** 畫面上顯示的值，照官方寫法 */
  value: string;
  kind: "line" | "sms" | "email" | "teams" | "fax" | "web";
  /** 有值時顯示「複製」按鈕，複製這段文字 */
  copy?: string;
  /** 有值時顯示「傳簡訊」按鈕（只開簡訊 App，不送出） */
  sms?: string;
}

export interface TextChannel {
  id: string;
  title: string;
  /** 一句話：可以做什麼 */
  summary: string;
  owner: string;
  hours: { label: string; value: string }[];
  contacts: Contact[];
  /** services.json 裡對應的服務，用來顯示「線上申辦」等按鈕 */
  serviceId?: string;
  /** 要用 services.json 該服務的哪個動作：main＝主要動作；alt＝第一個文字管道 */
  serviceAction?: "main" | "alt";
  notes: string[];
  sources: Source[];
}

const VERIFIED = "2026-11-07";

const SRC_1999_QA: Source = {
  label: "臺北市政府〈1999手語視訊問答集〉（2026-03-04 更新）",
  url: "https://www.gov.taipei/News_Content.aspx?n=EEC70A4186D4C828&s=F5CEE86CEA66A092",
  verified: VERIFIED,
};
const SRC_1999_DOSW: Source = {
  label: "社會局〈1999 手語視訊服務〉（2026-04-28 更新）",
  url: "https://dosw.gov.taipei/News_Content.aspx?n=E76EE035FB30679A&sms=9DB69DA964B89A34&s=242DF8D40BFAB6D3",
  verified: VERIFIED,
};
const SRC_SIGN: Source = {
  label: "社會局〈手語翻譯及同步聽打服務〉（2026-09-09 更新）",
  url: "https://dosw.gov.taipei/cp.aspx?n=A1FBE0253EA9B6E1",
  verified: VERIFIED,
};
const SRC_VRS: Source = {
  label: "社會局〈手語視訊轉譯服務〉介紹（2024-08-22 更新）",
  url: "https://dosw.gov.taipei/cp.aspx?n=C07ED4A5E3B75BF1",
  verified: VERIFIED,
};
const SRC_1957: Source = {
  label: "衛生福利部 1957 福利諮詢專線",
  url: "https://www.mohw.gov.tw/cp-16-73247-1.html",
  verified: VERIFIED,
};
const SRC_119_FLYER: Source = {
  label: "臺北市消防局〈聽語障人士 119 緊急報案服務宣導單〉（2023-02）",
  url: "https://www-ws.gov.taipei/001/Upload/691/relfile/61747/8937655/b275fc3e-70f8-4e5b-83da-f7fdb9a77e18.pdf",
  verified: VERIFIED,
};
const SRC_119_NFA: Source = {
  label: "內政部消防署〈聽語障人士報案〉頁（未標更新日期）",
  url: "https://www.nfa.gov.tw/cht/index.php?code=list&ids=67",
  verified: VERIFIED,
};
const SRC_119_OPEN: Source = {
  label: "消防署開放資料 data.gov.tw/dataset/7917（2025-12 更新）",
  url: "https://data.gov.tw/dataset/7917",
  verified: VERIFIED,
};
const SRC_110_OPEN: Source = {
  label: "警政署開放資料 data.gov.tw/dataset/7916",
  url: "https://data.gov.tw/dataset/7916",
  verified: VERIFIED,
};

/** /text 文字聯絡：聽障者不用講電話就能聯絡市府的管道 */
export const TEXT_CHANNELS: readonly TextChannel[] = [
  {
    id: "1999",
    title: "1999 用文字問",
    summary: "用 LINE 打字問市政府，或用手語視訊。人員會先確認您是聽（語）障者。",
    owner: "臺北市政府研考會",
    hours: [
      { label: "文字", value: "全年 24 小時" },
      { label: "手語視訊", value: "週一至週六 9:00–18:00" },
    ],
    contacts: [
      { label: "LINE ID", value: "taipeicity1999", kind: "line", copy: "taipeicity1999" },
      { label: "Teams 聯絡人", value: "taipei1999_1@outlook.com", kind: "teams", copy: "taipei1999_1@outlook.com" },
    ],
    notes: [
      "打開 LINE →「加入好友」→ 搜尋 ID，貼上 taipeicity1999。",
      "區公所、戶政、健康服務中心、捷運臺北車站、圓山站、松山機場站等 73 處有手語視訊設備，免帳號，限上班時間。",
    ],
    sources: [SRC_1999_QA, SRC_1999_DOSW],
  },
  {
    id: "sign-language",
    title: "手語翻譯、同步聽打",
    summary: "看病、到政府機關辦事時，請翻譯員陪同。原則上 3 天前申請，緊急案件不在此限。",
    owner: "臺北市政府社會局（委託中華民國聽障人協會，到 2026-12-31）",
    hours: [
      { label: "手語翻譯", value: "24 小時" },
      { label: "同步聽打", value: "8:00–22:00（依人力調度）" },
      { label: "受理申請", value: "週一至週五 8:00–20:00" },
    ],
    contacts: [
      { label: "LINE ID", value: "0963-047-723", kind: "line", copy: "0963-047-723" },
      { label: "簡訊", value: "0963-047-723", kind: "sms", sms: "0963047723" },
      { label: "免付費傳真", value: "0800-365-624", kind: "fax" },
      { label: "Email", value: "cnad002@gmail.com", kind: "email", copy: "cnad002@gmail.com" },
    ],
    serviceId: "sign-language",
    serviceAction: "main",
    notes: ["線上申辦要先登入。也可以用「看診溝通卡」頁幫您寫好申請文字。"],
    sources: [SRC_SIGN],
  },
  {
    id: "vrs",
    title: "手語視訊轉譯（VRS）",
    summary: "透過手語視訊，請翻譯員幫您打電話給私人單位，例如訂餐、叫車、問診所。",
    owner: "衛生福利部、數位發展部",
    hours: [{ label: "服務時間", value: "請見官網（我們還沒有確認）" }],
    contacts: [{ label: "網站", value: "vrs.sfaa.gov.tw", kind: "web" }],
    serviceId: "vrs",
    serviceAction: "main",
    notes: [],
    sources: [SRC_VRS],
  },
  {
    id: "1957",
    title: "1957 福利諮詢（線上文字）",
    summary: "不知道可以領什麼補助，可以在 1957 官網用文字即時問。",
    owner: "衛生福利部",
    hours: [{ label: "服務時間", value: "每天 8:00–22:00，全年無休" }],
    contacts: [{ label: "網站", value: "1957.mohw.gov.tw", kind: "web" }],
    serviceId: "welfare-1957",
    serviceAction: "alt",
    notes: ["1957 也有 LINE 文字客服，但 LINE ID 我們還沒確認，請先用網站。"],
    sources: [SRC_1957],
  },
];

/** 119 簡訊號碼：兩個官方版本互相矛盾，畫面上兩個都列，並標「待確認」 */
export interface SmsNumber {
  number: string;
  /** 備用號碼（只有開放資料版本有） */
  backup?: string;
  pending: boolean;
  sources: Source[];
}

export const SMS_119: readonly SmsNumber[] = [
  { number: "0911511902", pending: true, sources: [SRC_119_FLYER, SRC_119_NFA] },
  { number: "0932299702", backup: "0963330119", pending: true, sources: [SRC_119_OPEN] },
];

export const SMS_110: { number: string; sources: Source[] } = {
  number: "0911510914",
  sources: [SRC_110_OPEN],
};

/** 119 的其他不用講話的方式（臺北市消防局宣導單 ✅） */
export const FAX_119 = { number: "02-2758-7865", sources: [SRC_119_FLYER, SRC_119_NFA] };
export const KEYPAD_119_SOURCE = SRC_119_FLYER;

/** 所有來源（給測試與「資料來源」區塊用） */
export function allSources(): Source[] {
  const list = [
    ...TEXT_CHANNELS.flatMap((c) => c.sources),
    ...SMS_119.flatMap((n) => n.sources),
    ...SMS_110.sources,
    ...FAX_119.sources,
  ];
  return list.filter((s, i) => list.findIndex((x) => x.url === s.url) === i);
}

/* ---------- 求助卡、看診問答卡（預先寫好的固定文字） ---------- */

export interface HelpCard {
  id: string;
  /** 給旁人看的大字 */
  text: string;
  /** 小字補充 */
  sub?: string;
}

export const HELP_CARDS: readonly HelpCard[] = [
  { id: "deaf", text: "我聽不到，請用寫的。", sub: "可以寫在紙上，或打字在手機上給我看。" },
  { id: "ambulance", text: "請幫我叫救護車。", sub: "我聽不到，沒辦法自己打 119。" },
  { id: "fire", text: "這裡有火災，請幫我打 119。", sub: "我聽不到，沒辦法自己打電話。" },
  { id: "police", text: "請幫我報警（110）。", sub: "我聽不到，沒辦法自己打電話。" },
  { id: "family", text: "請幫我聯絡家人。", sub: "家人的電話在我的手機裡，我可以拿給您看。" },
  { id: "slow", text: "請面向我，說慢一點。", sub: "我可以看您的嘴型。" },
];

export const CLINIC_MAIN_CARD = "我聽力不好，請面向我、說慢一點，或寫下來。";

export interface ClinicQuestion {
  id: string;
  question: string;
  options: string[];
}

/** 看診常用問答：醫護或長輩點選答案，畫面上用大字顯示 */
export const CLINIC_QUESTIONS: readonly ClinicQuestion[] = [
  { id: "where", question: "哪裡不舒服？", options: ["頭", "喉嚨", "胸口", "肚子", "背", "手腳", "皮膚", "眼睛耳朵"] },
  { id: "days", question: "不舒服幾天了？", options: ["今天", "1～2 天", "3～7 天", "超過一週"] },
  { id: "pain", question: "有多痛？", options: ["不痛", "一點點", "很痛", "痛到受不了"] },
  { id: "fever", question: "有發燒嗎？", options: ["有", "沒有", "不知道"] },
  { id: "times", question: "藥一天吃幾次？", options: ["1 次", "2 次", "3 次", "4 次", "痛的時候才吃"] },
  { id: "when", question: "什麼時候吃藥？", options: ["飯前", "飯後", "睡前"] },
  { id: "next", question: "下次什麼時候回診？", options: ["1 週後", "2 週後", "1 個月後", "不用回診"] },
];
