"use client";

import { useCallback, useState } from "react";
import { useElder } from "./ElderProvider";

/**
 * 操作失敗（打不開簡訊、不能撥電話、拿不到位置…）的提示。
 *
 * say() 的大字提示 4 秒後就會消失。聽不清楚模式沒有聲音，大字是唯一的管道，
 * 長輩沒在看螢幕或讀得慢就會錯過（WCAG 2.2.1 時間可調整）。
 * 所以失敗時除了 say()，也在按鈕旁邊留一段文字，直到下一次操作才清掉。
 *
 * 用法：
 *   const note = useFailNote();
 *   onClick={async () => { note.clear(); if (!ok) note.fail("打不開簡訊…", "sms"); }}
 *   <FailNote message={note.at("sms")} />
 *
 * `key` 用來分辨同一個畫面裡的多個按鈕（例如兩個簡訊號碼），只有一個按鈕時可以省略。
 */
export function useFailNote() {
  const { say } = useElder();
  const [failure, setFailure] = useState<{ text: string; key: string } | null>(null);

  const fail = useCallback(
    (text: string, key = "") => {
      setFailure({ text, key });
      say(text);
    },
    [say],
  );
  const clear = useCallback(() => setFailure(null), []);
  const at = useCallback((key = "") => (failure?.key === key ? failure.text : null), [failure]);

  return { fail, clear, at };
}

export function FailNote({ message }: { message: string | null }) {
  if (!message) return null;
  // 不加 role="alert"：fail() 已經 say() 過（寫進 live region），加了報讀軟體會唸兩次
  return (
    <p className="rounded-xl border-4 border-alarm bg-white p-3 text-elder-body font-bold text-text-primary">{message}</p>
  );
}
