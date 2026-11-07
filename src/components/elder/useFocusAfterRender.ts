"use client";

import { useCallback, useEffect, useRef } from "react";

/**
 * 操作後把焦點移到「下一次畫面更新才會出現」的元素（例如結果標題、確認頁標題、剛載入的第 11 筆）。
 * 按鈕被換掉時，報讀軟體的焦點會掉到頁首；移到新內容的標題，使用者才知道發生了什麼。
 *
 * 用法：
 *   const { register, focusLater } = useFocusAfterRender();
 *   <h2 ref={register("result")} tabIndex={-1}>…</h2>
 *   focusLater("result"); setState(…);   // 同一個事件裡改 state，下一次 render 後就會移焦點
 *
 * 注意（整合者規範）：移了焦點，報讀軟體會唸標題；這時不要再呼叫 say()，否則會唸兩次。
 * 寫法：if (!a11y.screenReader) say(…)。
 */
export function useFocusAfterRender() {
  const pending = useRef<string | null>(null);
  const elements = useRef(new Map<string, HTMLElement>());

  useEffect(() => {
    const key = pending.current;
    if (!key) return;
    const el = elements.current.get(key);
    if (el) {
      pending.current = null;
      el.focus();
    }
  });

  const register = useCallback(
    (key: string) => (el: HTMLElement | null) => {
      if (el) elements.current.set(key, el);
      else elements.current.delete(key);
    },
    [],
  );

  const focusLater = useCallback((key: string) => {
    pending.current = key;
  }, []);

  return { register, focusLater };
}
