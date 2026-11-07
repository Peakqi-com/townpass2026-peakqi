"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { getBusEta, type BusEtaItem } from "@/lib/bus/client";
import type { FamilyBus } from "@/lib/elder/familyConfig";
import { Icon } from "./Icon";
import { useElder } from "./ElderProvider";

/** 畫面開著時多久自動更新一次（上游每 15～20 秒更新，伺服器快取 20 秒） */
const REFRESH_MS = 30_000;

type State =
  | { status: "loading" }
  | { status: "done"; items: BusEtaItem[]; checkedAt: Date; source: { title: string; url: string } }
  | { status: "error" };

const timeText = (d: Date) =>
  new Intl.DateTimeFormat("zh-TW", { timeZone: "Asia/Taipei", hour: "numeric", minute: "2-digit", hour12: false }).format(d);

/**
 * M16 首頁的「公車還有幾分鐘到」：家人用設定碼設好的常坐公車（最多 2 組）。
 * 路線名稱存在設定碼裡，斷網時也看得到是哪一班；時間一定要連網才查得到。
 */
export function BusCard({ buses }: { buses: readonly FamilyBus[] }) {
  const { announce, say } = useElder();
  const [state, setState] = useState<State>({ status: "loading" });
  const request = useRef(0);

  /** 查一次（只回傳結果，不改畫面；由呼叫的地方決定要不要套用） */
  const fetchState = useCallback(async (): Promise<State> => {
    try {
      const res = await getBusEta(buses);
      return { status: "done", items: res.items, checkedAt: new Date(res.checkedAt), source: res.source };
    } catch {
      return { status: "error" };
    }
  }, [buses]);

  /** 只套用最新一次查詢的結果（自動更新和手動按的可能同時在跑） */
  const apply = useCallback((id: number, next: State) => {
    if (id === request.current) setState(next);
  }, []);

  // 一打開就查；畫面在前景時每 30 秒更新，切到背景就不查（省電、省流量）
  useEffect(() => {
    let cancelled = false;
    const run = () => {
      const id = ++request.current;
      void fetchState().then((next) => {
        if (!cancelled) apply(id, next);
      });
    };
    run();
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") run();
    }, REFRESH_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [fetchState, apply]);

  const refresh = async () => {
    announce("再查一次公車");
    const id = ++request.current;
    const next = await fetchState();
    apply(id, next);
    if (next.status === "error") {
      say("公車時間查不到。可能是沒有網路，請稍後再試。");
    } else if (next.status === "done") {
      say(buses.map((b, i) => `${b.label}，${next.items[i]?.text ?? "查不到時間"}`).join("。"));
    }
  };

  return (
    <section aria-labelledby="bus-heading" className="flex flex-col gap-3 rounded-2xl border-4 border-elder-ride bg-white p-4">
      <h2 id="bus-heading" className="flex items-center gap-3 text-elder-button font-bold text-text-primary">
        <Icon name="ride" className="size-9 shrink-0" />
        公車還有幾分鐘
      </h2>

      <ul className="flex flex-col gap-3">
        {buses.map((bus, i) => {
          const item = state.status === "done" ? state.items[i] : undefined;
          return (
            <li key={`${bus.city}-${bus.routeId}-${bus.stopId}`} className="flex flex-col gap-1 rounded-xl bg-bg-dark p-3">
              <p className="text-elder-body text-text-primary">{bus.label}</p>
              <p className="text-elder-title font-bold text-text-primary">
                {state.status === "loading" ? "正在查…" : state.status === "error" ? "查不到時間" : (item?.text ?? "查不到時間")}
              </p>
              {/* 舊的設定碼沒有站牌位置，就不顯示 */}
              {bus.lat !== undefined && (
                <Link
                  href={`/walk?bus=${i}`}
                  onClick={() => announce("帶我走到站牌")}
                  className="mt-1 flex min-h-14 items-center justify-center rounded-xl border-4 border-grayscale-800 bg-white px-4 text-elder-body font-bold text-text-primary outline-offset-2 focus-visible:outline focus-visible:outline-[6px] focus-visible:outline-grayscale-900 active:outline active:outline-[6px] active:outline-grayscale-900"
                >
                  帶我走到站牌
                </Link>
              )}
            </li>
          );
        })}
      </ul>

      {state.status === "error" && (
        <p className="text-elder-body text-text-primary">可能是沒有網路。有網路時再按一次「再查一次」。</p>
      )}
      {state.status === "done" && (
        <p className="text-h3 text-text-second">
          {timeText(state.checkedAt)} 查的，每 30 秒自動更新。資料：
          <a href={state.source.url} className="underline underline-offset-2">
            {state.source.title}
          </a>
          （臺北市公共運輸處）
        </p>
      )}

      <button
        type="button"
        onClick={() => void refresh()}
        className="flex min-h-[4.5rem] items-center justify-center gap-3 rounded-2xl bg-elder-ride px-5 text-elder-button font-bold text-on-elder-ride outline-offset-2 focus-visible:outline focus-visible:outline-[6px] focus-visible:outline-grayscale-900 active:outline active:outline-[6px] active:outline-grayscale-900"
      >
        再查一次
      </button>
    </section>
  );
}
