"use client";

import { useEffect, useRef, useState } from "react";
import type { Source } from "@/lib/elder/hearing";
import { useElder } from "../ElderProvider";

/**
 * M8 聽不清楚三頁（/text、/help、/card/clinic）共用的小元件。
 * 大按鈕的外觀和 ServiceButton 一致：至少 72px 高、按下時粗框（不靠變色）。
 */

export const FOCUS =
  "outline-offset-2 focus-visible:outline focus-visible:outline-[6px] focus-visible:outline-grayscale-900 active:outline active:outline-[6px] active:outline-grayscale-900";

/** 次要的大按鈕：白底粗框 */
export const SECONDARY_BUTTON =
  `flex min-h-[4.5rem] w-full items-center justify-center gap-3 rounded-2xl border-4 border-grayscale-800 bg-white px-4 py-3 text-center text-elder-body font-bold text-text-primary ${FOCUS}`;

/** 主要的大按鈕（顏色另外給） */
export const PRIMARY_BUTTON =
  `flex min-h-[4.5rem] w-full items-center justify-center gap-3 rounded-2xl px-4 py-3 text-center text-elder-button font-bold ${FOCUS}`;

/** 可切換的選項按鈕：選到時深底＋「✓」，不只靠顏色 */
export function toggleClass(pressed: boolean): string {
  return `flex min-h-[4.5rem] items-center justify-center gap-2 rounded-2xl border-4 border-grayscale-800 px-3 py-2 text-center text-elder-body font-bold ${FOCUS} ${
    pressed ? "bg-grayscale-800 text-white" : "bg-white text-text-primary"
  }`;
}

export const INPUT =
  "min-h-[4.5rem] w-full min-w-0 rounded-2xl border-4 border-grayscale-800 bg-white px-4 text-elder-body text-text-primary placeholder:text-text-second";

export const LABEL = "text-elder-body font-bold text-text-primary";

/**
 * 複製文字。WebView 裡 navigator.clipboard 可能被擋（非 https 或沒有使用者手勢），
 * 這時退回舊的 execCommand 做法。
 */
export async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // 改用下面的舊做法
  }
  try {
    const area = document.createElement("textarea");
    area.value = text;
    area.setAttribute("readonly", "");
    area.style.position = "fixed";
    area.style.opacity = "0";
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand("copy");
    area.remove();
    return ok;
  } catch {
    return false;
  }
}

/** 「複製」按鈕：結果用 say 說出來（報讀軟體會唸、畫面有大字） */
export function CopyButton({ text, label, done = "複製好了，可以貼到 LINE 或簡訊。" }: { text: string; label: string; done?: string }) {
  const { announce, say } = useElder();
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        announce(label);
        const ok = await copyText(text);
        setCopied(ok);
        say(ok ? done : "沒辦法複製。請照著畫面上的字輸入，或請家人幫忙。");
      }}
      className={SECONDARY_BUTTON}
    >
      {copied ? `✓ ${label}（已複製）` : label}
    </button>
  );
}

/** 出處與查證日期（原則 8：只放官方資料，標出主責機關和查證日期） */
export function SourceList({ sources, owner }: { sources: readonly Source[]; owner?: string }) {
  return (
    <div className="flex flex-col gap-1 text-h3 text-text-second">
      {owner && <p>主責：{owner}</p>}
      <ul className="flex flex-col gap-1">
        {sources.map((s) => (
          <li key={s.url}>
            來源：
            <a href={s.url} className="underline underline-offset-2">
              {s.label}
            </a>
            （{s.verified} 查證）
          </li>
        ))}
      </ul>
    </div>
  );
}

export interface BigCard {
  text: string;
  sub?: string;
}

/**
 * 全螢幕大字卡：把手機轉給旁人看。
 * 用原生 <dialog>（showModal）：焦點會留在卡片裡，按返回鍵或「關閉」就回到原本的位置。
 * 「上下翻轉」讓坐在對面的人不用把手機轉過去也看得懂。
 */
export function FullScreenCard({ card, onClose }: { card: BigCard | null; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const [flipped, setFlipped] = useState(false);
  const { announce } = useElder();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (card && !dialog.open) dialog.showModal();
    if (!card && dialog.open) dialog.close();
  }, [card]);

  return (
    <dialog
      ref={ref}
      aria-labelledby="big-card-text"
      onClose={() => {
        setFlipped(false);
        onClose();
      }}
      className="m-0 h-dvh max-h-none w-screen max-w-none bg-white p-0 backdrop:bg-grayscale-900"
    >
      {card && (
        <div className="flex h-full flex-col gap-4 p-4">
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              aria-pressed={flipped}
              onClick={() => {
                announce(flipped ? "轉回來" : "上下翻轉");
                setFlipped((f) => !f);
              }}
              className={toggleClass(flipped)}
            >
              {flipped ? "✓ 已翻轉" : "上下翻轉"}
            </button>
            <button
              type="button"
              onClick={() => {
                announce("關閉");
                ref.current?.close();
              }}
              className={`${PRIMARY_BUTTON} bg-grayscale-800 text-white`}
            >
              關閉
            </button>
          </div>
          <div
            className={`flex flex-1 flex-col items-center justify-center gap-6 overflow-auto rounded-3xl border-8 border-grayscale-900 p-6 text-center ${
              flipped ? "rotate-180" : ""
            }`}
          >
            <p id="big-card-text" className="break-words text-[3rem] font-bold leading-tight text-grayscale-900">
              {card.text}
            </p>
            {card.sub && <p className="break-words text-elder-button text-text-primary">{card.sub}</p>}
          </div>
        </div>
      )}
    </dialog>
  );
}
