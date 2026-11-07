"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { getUserInfo } from "@/lib/townpass/bridge";
import { applyTextScale, getA11yState, haptic, speak, type A11yState } from "@/lib/townpass/elder";
import type { TownPassAccount } from "@/lib/townpass/types";
import { parseMode, type ElderMode } from "@/lib/elder/profile";

const MODE_KEY = "elder-mode";

interface ElderContextValue {
  /** 還沒選過模式時是 null（首頁會先顯示模式選擇） */
  mode: ElderMode | null;
  setMode: (mode: ElderMode) => void;
  a11y: A11yState;
  /** 實際套用的字級倍率（看不清楚模式至少 1.3 倍） */
  textScale: number;
  user: TownPassAccount | null;
  /** 使用者資料與模式都讀取完成 */
  ready: boolean;
  /** 讀取完成當下的時間（只在瀏覽器端取得，用來判斷問候語與權益期限） */
  now: Date | null;
  /**
   * 按下按鈕時的回饋：震動＋大字＋唸出來。
   * 螢幕閱讀器開著時不唸也不顯示（報讀軟體已經唸過按鈕名稱）；聽不清楚模式不出聲。
   */
  announce: (text: string) => void;
}

const ElderContext = createContext<ElderContextValue | null>(null);

export function useElder(): ElderContextValue {
  const value = useContext(ElderContext);
  if (!value) throw new Error("useElder 必須在 <ElderProvider> 裡使用");
  return value;
}

/* ---------- 模式存在 localStorage（外部儲存，用 useSyncExternalStore 讀取） ---------- */

// localStorage 在私密模式或被封鎖時會丟例外：讀寫都用 try/catch，存不了時保留在記憶體裡
let memoryMode: ElderMode | null = null;
const modeListeners = new Set<() => void>();

function readMode(): ElderMode | null {
  try {
    return parseMode(window.localStorage.getItem(MODE_KEY)) ?? memoryMode;
  } catch {
    return memoryMode;
  }
}

function writeMode(mode: ElderMode): void {
  memoryMode = mode;
  try {
    window.localStorage.setItem(MODE_KEY, mode);
  } catch {
    // 存不了就只在這次使用期間有效
  }
  modeListeners.forEach((listener) => listener());
}

function subscribeMode(listener: () => void): () => void {
  modeListeners.add(listener);
  window.addEventListener("storage", listener);
  return () => {
    modeListeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

/** 伺服器端沒有 localStorage，一律當作還沒選 */
const serverMode = (): ElderMode | null => null;

export function ElderProvider({ children }: { children: React.ReactNode }) {
  const mode = useSyncExternalStore(subscribeMode, readMode, serverMode);
  const [a11y, setA11y] = useState<A11yState>({ screenReader: false, textScale: 1 });
  const [user, setUser] = useState<TownPassAccount | null>(null);
  const [ready, setReady] = useState(false);
  const [now, setNow] = useState<Date | null>(null);
  const [status, setStatus] = useState("");
  const statusTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let cancelled = false;
    getUserInfo()
      .catch(() => null)
      .then((account) => {
        if (cancelled) return;
        setUser(account);
        setNow(new Date());
        setReady(true);
      });
    getA11yState().then((state) => {
      if (!cancelled) setA11y(state);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const textScale = mode === "vision" ? Math.max(a11y.textScale, 1.3) : a11y.textScale;

  useEffect(() => {
    applyTextScale(textScale);
  }, [textScale]);

  useEffect(() => () => {
    if (statusTimer.current) clearTimeout(statusTimer.current);
  }, []);

  const setMode = useCallback((next: ElderMode) => writeMode(next), []);

  const announce = useCallback(
    (text: string) => {
      haptic("light");
      if (a11y.screenReader) return;
      setStatus(text);
      if (statusTimer.current) clearTimeout(statusTimer.current);
      statusTimer.current = setTimeout(() => setStatus(""), 2500);
      if (mode !== "hearing") speak(text).catch(() => {});
    },
    [a11y.screenReader, mode],
  );

  const value = useMemo(
    () => ({ mode, setMode, a11y, textScale, user, ready, now, announce }),
    [mode, setMode, a11y, textScale, user, ready, now, announce],
  );

  return (
    <ElderContext.Provider value={value}>
      {children}
      {/* 唸出來的話同時用大字顯示（聽障者看得到）。live region 必須一開始就存在於 DOM */}
      <div
        role="status"
        aria-live="polite"
        className={`pointer-events-none fixed inset-x-4 top-4 z-50 rounded-2xl bg-grayscale-900 px-5 py-4 text-center text-elder-button font-bold text-white shadow-lg transition-opacity motion-reduce:transition-none ${
          status ? "opacity-95" : "opacity-0"
        }`}
      >
        {status}
      </div>
    </ElderContext.Provider>
  );
}
