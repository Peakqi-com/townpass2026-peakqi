/**
 * M11 防詐先問一下：長輩點選或打出「對方說了什麼」，在手機裡比對常見詐騙說法。
 *
 * - 不用任何 AI 模型、不呼叫網路，斷網也能用；結果可以預期（同一句話永遠得到同一個結果）。
 * - 詐騙手法、關鍵字、提醒文字都在 src/data/antifraud.json，只用內政部警政署 165 全民防騙網
 *   打開原文核對過的內容（查證紀錄見 docs/antifraud-research.md），每筆都有 source 與 verified。
 * - **永遠不說「這不是詐騙」或「安全」**：比對不到時只說「我們不確定」，並提醒先停下來。
 *   長輩打的字可能不完整、語音辨識也可能聽錯，比對不到不代表沒事。
 */
import raw from "../../data/antifraud.json" with { type: "json" };
import { normalize } from "./match.ts";

export interface Scam {
  id: string;
  /** 手法名稱，以「詐騙」結尾，畫面上說「這很像〇〇詐騙」 */
  name: string;
  /** 點選用的大按鈕文字：對方會說的話 */
  choice: string;
  /** 比對用的說法（取自官方原文，或長輩口語的同義說法） */
  keywords: string[];
  /** 一句官方提醒 */
  warning: string;
  /** 提醒文字的官方出處 */
  source: string;
  /** 關鍵字的其他官方出處 */
  also?: string[];
  verified: string;
}

export interface Step {
  id: string;
  text: string;
  source: string;
  verified: string;
}

export interface MoneyWords {
  words: string[];
  source: string;
  verified: string;
}

export const SCAMS: readonly Scam[] = raw.scams;
/** 不管像不像詐騙，都先做的事 */
export const STEPS: readonly Step[] = raw.steps;
/** 提到錢的字：不對應特定手法，只用來加強「先不要轉帳」的提醒 */
export const MONEY: MoneyWords = raw.money;

/** 同時像好幾種時，最多列出幾種（太多長輩記不住） */
export const MAX_MATCHES = 2;

/** 比對不到時說的話。注意：不能說「不是詐騙」「安全」 */
export const UNSURE_HEADLINE = "我們不確定，請先停下來";
export const UNSURE_LINE = "我們不確定這是哪一種。但遇到要錢、要帳號密碼，就先停下來，先問家人或 165。";
const MONEY_LINE = "對方提到錢，先不要轉帳。";
const MATCH_TAIL = "先掛電話，不要轉帳。";

export interface AntifraudResult {
  kind: "match" | "unsure";
  /** 結果畫面的標題（h1），也是第一句 */
  headline: string;
  /** 標題下面的說明 */
  lines: string[];
  /** 像哪幾種手法（最像的排第一）；不確定時是空陣列 */
  scams: Scam[];
  /** 對方提到錢（轉帳、匯款、ATM…） */
  mentionsMoney: boolean;
  /** 沒開報讀軟體時唸出來的話：重點在第一句 */
  speech: string;
}

function bigrams(text: string): string[] {
  const chars = [...text];
  const result: string[] = [];
  for (let i = 0; i < chars.length - 1; i++) result.push(chars[i] + chars[i + 1]);
  return result;
}

/** 關鍵字的兩字片段有幾成出現在長輩說的話裡（給語音辨識聽錯一個字的情況） */
function fuzzyRatio(query: string, keyword: string): number {
  const grams = bigrams(keyword);
  if (grams.length === 0) return 0;
  const queryGrams = new Set(bigrams(query));
  return grams.filter((g) => queryGrams.has(g)).length / grams.length;
}

function score(scam: Scam, query: string): { exact: number; fuzzy: number } {
  let exact = 0;
  let fuzzy = 0;
  for (const raw of scam.keywords) {
    const keyword = normalize(raw);
    if (!keyword) continue;
    if (query.includes(keyword)) {
      // 說法越長越具體，分數越高
      exact += 10 + [...keyword].length;
    } else if ([...query].length >= 2 && keyword.includes(query)) {
      // 長輩只打了一部分，例如「分期」
      exact += 5 + [...query].length;
    } else if ([...keyword].length >= 4) {
      const ratio = fuzzyRatio(query, keyword);
      if (ratio >= 0.6) fuzzy = Math.max(fuzzy, ratio * 4);
    }
  }
  return { exact, fuzzy };
}

/** 比對長輩說的話，回傳最像的手法（最多 MAX_MATCHES 種）；比對不到回空陣列 */
export function matchScams(text: string): Scam[] {
  const query = normalize(text);
  if (!query) return [];
  const scored = SCAMS.map((scam, index) => ({ scam, index, ...score(scam, query) }));
  // 有確切命中時，不補上只是字面相似的手法
  const anyExact = scored.some((r) => r.exact > 0);
  return scored
    .map((r) => ({ scam: r.scam, index: r.index, s: anyExact ? r.exact : r.fuzzy }))
    .filter((r) => r.s > 0)
    .sort((a, b) => b.s - a.s || a.index - b.index)
    .slice(0, MAX_MATCHES)
    .map((r) => r.scam);
}

export function mentionsMoney(text: string): boolean {
  const query = normalize(text);
  return query.length > 0 && MONEY.words.some((w) => query.includes(normalize(w)));
}

function matchResult(scams: Scam[], money: boolean): AntifraudResult {
  const [first, second] = scams;
  const headline = `這很像${first.name}`;
  const lines = [first.warning];
  if (second) lines.push(`也有點像${second.name}：${second.warning}`);
  return {
    kind: "match",
    headline,
    lines,
    scams,
    mentionsMoney: money,
    speech: `${headline}。${first.warning}${MATCH_TAIL}`,
  };
}

function unsureResult(money: boolean): AntifraudResult {
  const lines = money ? [MONEY_LINE, UNSURE_LINE] : [UNSURE_LINE];
  return {
    kind: "unsure",
    headline: UNSURE_HEADLINE,
    lines,
    scams: [],
    mentionsMoney: money,
    speech: money ? `我們不確定。${MONEY_LINE}遇到要錢、要帳號密碼，就先停下來，先問家人或 165。` : `我們不確定。但遇到要錢、要帳號密碼，就先停下來，先問家人或 165。`,
  };
}

/** 長輩打的字或說的話 → 結果 */
export function judge(text: string): AntifraudResult {
  const scams = matchScams(text);
  const money = mentionsMoney(text);
  return scams.length > 0 ? matchResult(scams, money) : unsureResult(money);
}

/** 長輩直接點了某個說法的按鈕 → 那種手法的結果 */
export function resultFor(scamId: string): AntifraudResult {
  const scam = SCAMS.find((s) => s.id === scamId);
  return scam ? matchResult([scam], false) : unsureResult(false);
}
