"use client";

import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { getBusEta } from "@/lib/bus/client";
import {
  busTimingSentence,
  findRoute,
  guidanceAt,
  locateOnRoute,
  markAudibleSignals,
  OFF_ROUTE_METERS,
  pointAt,
  spokenMeters,
  stepSentence,
  walkMinutes,
  type Route,
} from "@/lib/elder/walk";
import { loadAudibleSignals, loadWalkGraph } from "@/lib/elder/walkData";
import type { LatLng } from "@/lib/opendata/geo";
import { getLocation, isInTownPass } from "@/lib/townpass/bridge";
import { haptic } from "@/lib/townpass/elder";
import { useElder } from "./ElderProvider";
import { PageShell } from "./PageShell";
import { useFamilyConfig } from "./useFamilyConfig";

/** 模擬行走的速度（公尺／秒）：約長輩步行的 5 倍，Demo 時 400 公尺不到 2 分鐘走完 */
const SIM_SPEED = 4;
const SIM_TICK_MS = 500;
/** 連續幾次偏離路線才重新找路（GPS 偶爾會跳一下） */
const OFF_ROUTE_COUNT = 2;
const DESTINATION = "站牌";

type Phase =
  | { kind: "loading"; text: string }
  | { kind: "error"; text: string }
  | { kind: "ready"; route: Route; summary: string };

type Mode = "idle" | "gps" | "sim";

const BUTTON =
  "flex min-h-[4.5rem] items-center justify-center gap-3 rounded-2xl px-5 text-elder-button font-bold outline-offset-2 focus-visible:outline focus-visible:outline-[6px] focus-visible:outline-grayscale-900 active:outline active:outline-[6px] active:outline-grayscale-900";

/** 開發時（不在台北通裡）可以用 ?from=25.1146,121.537 指定起點，在電腦上測 */
function devStart(params: URLSearchParams): LatLng | null {
  if (isInTownPass()) return null;
  const [lat, lng] = (params.get("from") ?? "").split(",").map(Number);
  return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null;
}

/**
 * M16 延伸：從現在的位置走到家人設定好的公車站牌，一步一步用語音、震動帶路。
 *
 * - 路線在手機上算（OSM 步行路網＋A*），斷網也能用；公車還有幾分鐘到要連網才查得到。
 * - 「模擬走一次」讓位置沿著路線自動前進，桌上測試和決選舞台用。
 * - 螢幕關掉時 WebView 會暫停，所以提醒長輩螢幕不要關。
 */
export function WalkScreen() {
  const params = useSearchParams();
  const { config } = useFamilyConfig();
  const { announce, say } = useElder();
  const bus = config?.buses?.[Number(params.get("bus") ?? 0)];
  // 設定的問題直接從設定算出來，不用等定位
  const setupError = !bus
    ? "還沒有設定常坐的公車。請家人在「我是家人，幫長輩設定」加上公車。"
    : bus.lat === undefined || bus.lng === undefined
      ? "這組公車是舊的設定碼，沒有站牌的位置。請家人重新做一次設定碼，再掃一次。"
      : null;

  const [phase, setPhase] = useState<Phase>({ kind: "loading", text: "正在找您現在的位置…" });
  const [mode, setMode] = useState<Mode>("idle");
  const [along, setAlong] = useState(0);

  // 跟著走的過程用 ref，避免 GPS 回呼拿到舊的值
  const routeRef = useRef<Route | null>(null);
  const alongRef = useRef(0);
  const saidRef = useRef(new Set<string>());
  const offCountRef = useRef(0);
  const stopRef = useRef<(() => void) | null>(null);
  const signalsRef = useRef<Awaited<ReturnType<typeof loadAudibleSignals>>>([]);

  const stop = useCallback(() => {
    stopRef.current?.();
    stopRef.current = null;
    setMode("idle");
  }, []);

  /** 從 from 算一條到站牌的路線；失敗時回傳給長輩看的原因 */
  const plan = useCallback(
    async (from: LatLng, target: LatLng): Promise<Route | string> => {
      const graph = await loadWalkGraph().catch(() => null);
      if (!graph) return "走路的路線資料還沒下載。請在有網路的地方打開一次「用得了」，之後沒有網路也能用。";
      const result = findRoute(graph, from, target);
      if (!result.ok) {
        const where = `站牌離您直線大約 ${spokenMeters(result.straightMeters)}。`;
        return result.reason === "outside"
          ? `這附近還沒有走路的路線資料（目前只有天母一帶）。${where}`
          : `找不到走得到的路。${where}可以請路人或家人幫忙。`;
      }
      return markAudibleSignals(result.route, signalsRef.current);
    },
    [],
  );

  // 一打開：定位 → 算路線 → 查公車還有幾分鐘 → 念出摘要和第一步
  useEffect(() => {
    if (!bus || bus.lat === undefined || bus.lng === undefined) return;
    const target = { lat: bus.lat, lng: bus.lng };
    let cancelled = false;
    (async () => {
      const [position, signals, eta] = await Promise.all([
        devStart(params) ?? getLocation().then((p) => (p ? { lat: p.latitude, lng: p.longitude } : null)).catch(() => null),
        loadAudibleSignals(),
        getBusEta([bus]).then((r) => r.items[0]?.seconds ?? null).catch(() => null),
      ]);
      if (cancelled) return;
      signalsRef.current = signals;
      if (!position) {
        const text = "找不到您現在的位置。請確認台北通可以使用定位，再按一次「帶我走到站牌」。";
        setPhase({ kind: "error", text });
        say(text);
        return;
      }
      setPhase({ kind: "loading", text: "正在找路…" });
      const route = await plan(position, target);
      if (cancelled) return;
      if (typeof route === "string") {
        setPhase({ kind: "error", text: route });
        say(route);
        return;
      }
      routeRef.current = route;
      const summary = busTimingSentence(walkMinutes(route.meters), eta);
      setPhase({ kind: "ready", route, summary });
      say(`${summary}${stepSentence(route.steps[0], route.steps[0].atMeters, DESTINATION)}。`);
    })();
    return () => {
      cancelled = true;
    };
    // params 只在第一次讀（開發用的起點），之後不跟著變
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bus, plan, say]);

  // 離開頁面時停止定位、模擬
  useEffect(() => () => stopRef.current?.(), []);

  /** 收到一個新位置：更新進度、念提醒、偏離太遠就重新找路 */
  const onPosition = useCallback(
    async (p: LatLng) => {
      const route = routeRef.current;
      if (!route || !bus?.lat || !bus.lng) return;
      const { along: now, offRoute } = locateOnRoute(route, p, alongRef.current);

      if (offRoute > OFF_ROUTE_METERS) {
        offCountRef.current += 1;
        if (offCountRef.current < OFF_ROUTE_COUNT) return;
        offCountRef.current = 0;
        const next = await plan(p, { lat: bus.lat, lng: bus.lng });
        if (typeof next === "string") {
          say(next);
          stop();
          return;
        }
        routeRef.current = next;
        alongRef.current = 0;
        saidRef.current = new Set();
        setAlong(0);
        setPhase((ph) => (ph.kind === "ready" ? { ...ph, route: next } : ph));
        haptic("medium");
        say(`好像走偏了，重新找路。${stepSentence(next.steps[0], next.steps[0].atMeters, DESTINATION)}`);
        return;
      }
      offCountRef.current = 0;
      alongRef.current = now;
      setAlong(now);
      for (const g of guidanceAt(route, now, saidRef.current, DESTINATION)) {
        if (g.haptic) haptic("medium");
        say(g.text);
      }
      if (saidRef.current.has(`${route.steps.length - 1}:now`)) stop();
    },
    [bus, plan, say, stop],
  );

  const reset = () => {
    alongRef.current = 0;
    offCountRef.current = 0;
    saidRef.current = new Set();
    setAlong(0);
  };

  const startGps = () => {
    announce("開始帶您走");
    reset();
    setMode("gps");
    if ("geolocation" in navigator) {
      const id = navigator.geolocation.watchPosition(
        (pos) => void onPosition({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => {
          // WebView 拿不到時，改成每 3 秒問一次台北通（location Handler）
          navigator.geolocation.clearWatch(id);
          const timer = setInterval(() => {
            void getLocation().then((p) => p && onPosition({ lat: p.latitude, lng: p.longitude }));
          }, 3000);
          stopRef.current = () => clearInterval(timer);
        },
        { enableHighAccuracy: true, maximumAge: 2000, timeout: 15000 },
      );
      stopRef.current = () => navigator.geolocation.clearWatch(id);
    }
  };

  const startSim = () => {
    const route = routeRef.current;
    if (!route) return;
    announce("模擬走一次");
    reset();
    setMode("sim");
    let walked = 0;
    const timer = setInterval(() => {
      walked = Math.min(route.meters, walked + (SIM_SPEED * SIM_TICK_MS) / 1000);
      void onPosition(pointAt(route, walked));
      if (walked >= route.meters) clearInterval(timer);
    }, SIM_TICK_MS);
    stopRef.current = () => clearInterval(timer);
  };

  const route = phase.kind === "ready" ? phase.route : null;
  const next = route?.steps.find((s) => s.atMeters > along - 5) ?? route?.steps.at(-1);

  return (
    <PageShell title="走到站牌">
      {bus && <p className="text-elder-body text-text-primary">{bus.label}</p>}

      {setupError && <p className="text-elder-body font-bold text-text-primary">{setupError}</p>}
      {!setupError && phase.kind === "loading" && <p className="text-elder-body text-text-second">{phase.text}</p>}
      {!setupError && phase.kind === "error" && <p className="text-elder-body font-bold text-text-primary">{phase.text}</p>}

      {route && next && phase.kind === "ready" && (
        <>
          <p className="text-elder-body font-bold text-text-primary">{phase.summary}</p>

          <section aria-labelledby="next-heading" className="flex flex-col gap-2 rounded-2xl border-4 border-elder-ride bg-white p-4">
            <h2 id="next-heading" className="text-elder-body text-text-second">
              {along >= route.meters - 15 ? "完成" : mode === "idle" && along === 0 ? "第一步" : "下一步"}
            </h2>
            <p className="text-elder-title font-bold text-text-primary">{stepSentence(next, next.atMeters - along, DESTINATION)}</p>
            {mode !== "idle" && (
              <p className="text-elder-body text-text-second">
                走了 {Math.round(along)} 公尺，還有 {Math.max(0, Math.round(route.meters - along))} 公尺
                {mode === "sim" && "（模擬中，速度加快）"}
              </p>
            )}
          </section>

          {mode === "idle" ? (
            <>
              <button type="button" onClick={startGps} className={`${BUTTON} bg-elder-ride text-on-elder-ride`}>
                開始帶我走
              </button>
              <p className="text-elder-body text-text-primary">走路時手機拿在手上，螢幕不要關，聲音開大一點。</p>
              <button type="button" onClick={startSim} className={`${BUTTON} border-4 border-grayscale-800 bg-white text-text-primary`}>
                模擬走一次
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => {
                announce("停下來了");
                stop();
              }}
              className={`${BUTTON} border-4 border-grayscale-800 bg-white text-text-primary`}
            >
              停下來
            </button>
          )}

          <section aria-labelledby="steps-heading" className="flex flex-col gap-2">
            <h2 id="steps-heading" className="text-elder-button font-bold text-text-primary">
              整條路怎麼走（{spokenMeters(route.meters)}）
            </h2>
            <ol className="flex list-decimal flex-col gap-2 pl-8">
              {route.steps.map((s, i) => (
                <li key={`${i}-${s.atMeters}`} className="text-elder-body text-text-primary">
                  {stepSentence(s, s.atMeters - (route.steps[i - 1]?.atMeters ?? 0), DESTINATION)}
                </li>
              ))}
            </ol>
          </section>

          <p className="text-elder-body text-text-primary">路線只是參考。過馬路一定要看號誌、走斑馬線。</p>
          <p className="text-h3 text-text-second">
            路線資料 © OpenStreetMap contributors（ODbL）；有聲號誌：臺北市交通管制工程處；公車：臺北市公共運輸處（data.taipei）
          </p>
        </>
      )}
    </PageShell>
  );
}
