/**
 * M2 找服務：把長輩說的話（或打的字）對應到服務清單，最多回三筆。
 *
 * 不使用任何 AI 模型，完全離線、結果可以預期：
 * 1. 正規化（全形轉半形、臺→台、去掉空白與標點）
 * 2. 完全包含長輩的說法（phrases）得高分，說法越長越具體、分數越高
 * 3. 語音辨識常聽錯一兩個字，所以沒有任何服務確切命中時，才用「兩字片段」的重疊程度補救
 *    （例如「敬老咖」→「敬老卡」）。已經有確切命中時，不補上只是字面相似的服務。
 */
import { SERVICES, type Service } from "./services.ts";
import type { ElderMode } from "./profile.ts";

export const MAX_RESULTS = 3;

export function normalize(text: string): string {
  return text
    .normalize("NFKC")
    .toLowerCase()
    .replaceAll("臺", "台")
    .replace(/[^\p{L}\p{N}]/gu, "");
}

function bigrams(text: string): string[] {
  const chars = [...text];
  const result: string[] = [];
  for (let i = 0; i < chars.length - 1; i++) result.push(chars[i] + chars[i + 1]);
  return result;
}

/** 說法的兩字片段有幾成出現在長輩說的話裡 */
function fuzzyRatio(query: string, phrase: string): number {
  const grams = bigrams(phrase);
  if (grams.length === 0) return 0;
  const queryGrams = new Set(bigrams(query));
  return grams.filter((g) => queryGrams.has(g)).length / grams.length;
}

function score(service: Service, query: string): { exact: number; fuzzy: number } {
  let exact = 0;
  let fuzzy = 0;
  for (const raw of [service.title, ...service.phrases]) {
    const phrase = normalize(raw);
    if (!phrase) continue;
    if (query.includes(phrase)) {
      exact += 10 + phrase.length;
    } else if (query.length >= 2 && phrase.includes(query)) {
      exact += 5 + query.length;
    } else {
      const ratio = fuzzyRatio(query, phrase);
      if (ratio >= 0.5) fuzzy = Math.max(fuzzy, ratio * 4);
    }
  }
  return { exact, fuzzy };
}

export interface FindOptions {
  /** 聽不清楚模式：同分時優先給聽障者可以用的服務 */
  mode?: ElderMode | null;
  services?: readonly Service[];
}

export function findServices(text: string, options: FindOptions = {}): Service[] {
  const query = normalize(text);
  if (!query) return [];
  const services = options.services ?? SERVICES;

  const scored = services.map((service, index) => ({ service, index, ...score(service, query) }));
  const anyExact = scored.some((r) => r.exact > 0);

  return scored
    .map((r) => {
      let s = anyExact ? r.exact : r.fuzzy;
      if (s > 0 && options.mode === "hearing" && r.service.audience.includes("hearing")) s += 0.5;
      if (s > 0 && options.mode === "vision" && r.service.audience.includes("vision")) s += 0.5;
      return { service: r.service, s, index: r.index };
    })
    .filter((r) => r.s > 0)
    .sort((a, b) => b.s - a.s || a.index - b.index)
    .slice(0, MAX_RESULTS)
    .map((r) => r.service);
}
