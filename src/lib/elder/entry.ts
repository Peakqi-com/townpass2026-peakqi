import type { ElderMode } from "./profile.ts";

/**
 * 打開服務時的瀏覽紀錄安排。
 *
 * 城市通 AppBar 的返回鍵只在 WebView 有上一頁時才出現（tp_web_view.dart 的 canGoBack）。
 * 選過模式的人一打開服務就直接進首頁，沒有上一頁，就沒有返回鍵可以換模式。
 * 所以第一次進首頁時，先把這筆紀錄換成 /mode，再 push 回首頁：紀錄變成 [/mode, /]，
 * 按返回就會回到選模式的頁面。
 *
 * flag 存在 sessionStorage（每次打開服務都是新的 WebView，會重新開始）：
 *   null      這次還沒安排過
 *   "forward" 首頁剛換成 /mode，/mode 要馬上 push 回首頁
 *   "done"    安排好了，之後都不再動
 *   undefined sessionStorage 不能用。這時一律不安排：寧可沒有返回鍵，也不能卡在循環裡
 */
export type EntryFlag = "forward" | "done" | null | undefined;

export function homeEntry({
  mode,
  flag,
  historyLength,
}: {
  mode: ElderMode | null;
  flag: EntryFlag;
  historyLength: number;
}): "pick" | "seed" | "stay" {
  if (mode === null) return "pick";
  // 沒有 sessionStorage 就沒辦法叫 /mode 自動回首頁，墊了只會讓長輩每次都看到選模式畫面
  if (flag === undefined) return "stay";
  // 已經有上一頁就不墊。墊完一定有上一頁，所以不會循環；不靠 flag 判斷，
  // 是因為 WebView 重開時 sessionStorage 可能還留著上次的值
  if (historyLength > 1) return "stay";
  return "seed";
}

export function modeEntry({ mode, flag }: { mode: ElderMode | null; flag: EntryFlag }): "forward" | "show" {
  return mode !== null && flag === "forward" ? "forward" : "show";
}

const KEY = "elder-entry";

export function readEntryFlag(): EntryFlag {
  try {
    const value = window.sessionStorage.getItem(KEY);
    return value === "forward" || value === "done" ? value : null;
  } catch {
    return undefined;
  }
}

export function writeEntryFlag(value: "forward" | "done"): void {
  try {
    window.sessionStorage.setItem(KEY, value);
  } catch {
    // 存不了的話，下次 readEntryFlag 會回 undefined，homeEntry 就不會再安排
  }
}
