"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { getUserInfo } from "@/lib/townpass/bridge";
import { applyTextScale, getA11yState, haptic, speak, type A11yState } from "@/lib/townpass/elder";
import type { TownPassAccount } from "@/lib/townpass/types";
import { defaultRate, parseMode, parseRate, RATE_VALUE, type ElderMode, type SpeechRate } from "@/lib/elder/profile";
import { createSettingStore } from "@/lib/elder/settingStore";

interface ElderContextValue {
  /** 還沒選過模式時是 null（首頁會先顯示模式選擇） */
  mode: ElderMode | null;
  setMode: (mode: ElderMode) => void;
  /** 自己唸（TTS）的速度。沒調過時依模式決定；開著報讀軟體時用的是報讀軟體自己的速度 */
  rate: SpeechRate;
  setRate: (rate: SpeechRate) => void;
  a11y: A11yState;
  /** 實際套用的字級倍率（看不清楚模式至少 1.3 倍） */
  textScale: number;
  user: TownPassAccount | null;
  /** 使用者資料與模式都讀取完成 */
  ready: boolean;
  /** 讀取完成當下的時間（只在瀏覽器端取得，用來判斷問候語與權益期限） */
  now: Date | null;
  /**
   * 按下按鈕「當下」的回饋：震動＋大字＋唸出按鈕名稱。
   * 螢幕閱讀器開著時只震動（報讀軟體已經唸過按鈕名稱，避免重複）；聽不清楚模式不出聲。
   */
  announce: (text: string) => void;
  /**
   * 操作「結果」的回饋，例如「找到 3 個服務」「打不開」：一律寫進 live region，
   * 讓 VoiceOver／TalkBack 唸出來，同時顯示大字；沒開報讀軟體時用 TTS 唸（聽不清楚模式除外）。
   */
  say: (text: string) => void;
}

const ElderContext = createContext<ElderContextValue | null>(null);

export function useElder(): ElderContextValue {
  const value = useContext(ElderContext);
  if (!value) throw new Error("useElder 必須在 <ElderProvider> 裡使用");
  return value;
}

const modeStore = createSettingStore("elder-mode", parseMode);
const rateStore = createSettingStore("elder-rate", parseRate);

export function ElderProvider({ children }: { children: React.ReactNode }) {
  const mode = useSyncExternalStore(modeStore.subscribe, modeStore.read, modeStore.readServer);
  const rate = useSyncExternalStore(rateStore.subscribe, rateStore.read, rateStore.readServer) ?? defaultRate(mode);
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

  const setMode = useCallback((next: ElderMode) => modeStore.write(next), []);
  const setRate = useCallback((next: SpeechRate) => rateStore.write(next), []);

  const showStatus = useCallback((text: string, ms: number) => {
    setStatus(text);
    if (statusTimer.current) clearTimeout(statusTimer.current);
    statusTimer.current = setTimeout(() => setStatus(""), ms);
  }, []);

  const announce = useCallback(
    (text: string) => {
      haptic("light");
      if (a11y.screenReader) return;
      showStatus(text, 2500);
      if (mode !== "hearing") speak(text, RATE_VALUE[rate]).catch(() => {});
    },
    [a11y.screenReader, mode, rate, showStatus],
  );

  const say = useCallback(
    (text: string) => {
      showStatus(text, 4000);
      if (!a11y.screenReader && mode !== "hearing") speak(text, RATE_VALUE[rate]).catch(() => {});
    },
    [a11y.screenReader, mode, rate, showStatus],
  );

  const value = useMemo(
    () => ({ mode, setMode, rate, setRate, a11y, textScale, user, ready, now, announce, say }),
    [mode, setMode, rate, setRate, a11y, textScale, user, ready, now, announce, say],
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
