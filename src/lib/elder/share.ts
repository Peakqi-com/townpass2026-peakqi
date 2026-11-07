/**
 * 「傳給家人知道」（ShareToFamily）要傳出去的文字。
 * 長輩送出前會在畫面上看到整段，也可以在簡訊 App 裡再改，所以用長輩自己的口氣寫。
 */
import { formatDay, type FollowUpKind } from "./reminders.ts";

/** 署名：「— 金大森」；沒有名字就不署名 */
function signature(name?: string): string {
  const trimmed = name?.trim();
  return trimmed ? `— ${trimmed}` : "";
}

/** 回診／領藥：「我 11 月 20 日（星期五）要回診，記得提醒我帶健保卡。— 金大森」 */
export function followUpShareText({ kind, date, name }: { kind: FollowUpKind; date: string; name?: string }): string {
  const what = kind === "revisit" ? "回診" : "領慢性病連續處方箋的藥";
  const bring = kind === "revisit" ? "健保卡" : "健保卡和處方箋";
  return `我 ${formatDay(date)}要${what}，記得提醒我帶${bring}。${signature(name)}`;
}

/** 求助頁：「我是金大森，現在需要幫忙，請盡快打電話給我。」 */
export function helpShareText(name?: string): string {
  const trimmed = name?.trim();
  return `${trimmed ? `我是${trimmed}，` : "我"}現在需要幫忙，請盡快打電話給我。`;
}
