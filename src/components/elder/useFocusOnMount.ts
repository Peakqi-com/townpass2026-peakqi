"use client";

import { useEffect, useRef } from "react";

/**
 * 換頁後把焦點移到這一頁的標題（h1）。
 * 網頁在 App 內換頁時，VoiceOver／TalkBack 的焦點不會自己移到新內容；
 * 移到標題後，報讀軟體會從頁面名稱開始唸，焦點順序也從頭開始。
 * 標題需要 tabIndex={-1} 才能接收焦點（不會進入 Tab 順序）。
 */
export function useFocusOnMount<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  useEffect(() => {
    ref.current?.focus({ preventScroll: true });
  }, []);
  return ref;
}
