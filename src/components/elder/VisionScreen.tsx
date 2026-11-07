"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getOpenData, type OpenDataResponse } from "@/lib/opendata/client";
import { isInTaipeiArea, type LatLng } from "@/lib/opendata/geo";
import {
  alertsForStation,
  buildStations,
  describeStation,
  formatDistance,
  nearestSignals,
  nearestStation,
  signalsSentence,
  stationCenter,
  stationsByLine,
  type Station,
  type StationExit,
} from "@/lib/elder/places";
import { getLocation } from "@/lib/townpass/bridge";
import { Icon } from "./Icon";
import { PageShell } from "./PageShell";
import { useElder } from "./ElderProvider";
import { useFocusAfterRender } from "./useFocusAfterRender";

type Row = Record<string, unknown>;

interface VisionData {
  stations: Station[];
  /** null：資料讀不到 */
  signals: Row[] | null;
  alerts: Row[] | null;
  sources: OpenDataResponse["source"][];
}

interface Answer {
  station: Station;
  /** 有定位時：最近的出入口與距離 */
  exit?: StationExit;
  distance?: number;
  /** 找有聲號誌的中心點：有定位時是目前位置，手動選站時是車站 */
  center: LatLng | null;
}

const FOCUS_RING =
  "outline-offset-2 focus-visible:outline focus-visible:outline-[6px] focus-visible:outline-grayscale-900 active:outline active:outline-[6px] active:outline-grayscale-900";
const BIG_BUTTON = `flex min-h-[4.5rem] w-full items-center justify-center gap-3 rounded-2xl px-5 py-3 text-center text-elder-button font-bold ${FOCUS_RING}`;
const DARK = "bg-grayscale-800 text-white";
const PLAIN = "border-4 border-grayscale-800 bg-white text-text-primary";

/** 把一個回答組成畫面與要唸的話 */
function compose(data: VisionData, answer: Answer) {
  const alerts = data.alerts ? alertsForStation(data.alerts, answer.station.name) : null;
  const info = describeStation(answer.station, { distance: answer.distance, exit: answer.exit, alerts });
  const signals = data.signals === null ? null : answer.center ? nearestSignals(data.signals, answer.center) : [];
  const signalText = signalsSentence(signals);
  return { info, signals, speech: info.summary + signalText };
}

/**
 * M10 視障出門：找最近的捷運站，用一句話說電梯在哪、有沒有異常，再列出附近 3 個有聲號誌路口。
 *
 * 地圖對報讀軟體幾乎讀不到，所以這頁只有文字：結果的標題就是重點（最近的站、哪個出口的電梯、多遠），
 * 細節依重要性往下排，報讀軟體用標題跳讀就能聽到。聽障者也看得到同樣的文字。
 */
export function VisionScreen() {
  const { a11y, say, announce } = useElder();
  const [data, setData] = useState<VisionData | null>(null);
  const [status, setStatus] = useState<"loading" | "locating" | "ready" | "error">("loading");
  const [answer, setAnswer] = useState<Answer | null>(null);
  const [picking, setPicking] = useState(false);
  const [line, setLine] = useState<string | null>(null);
  const { register, focusLater } = useFocusAfterRender();

  // 非同步流程裡要用最新的 a11y／say（報讀軟體狀態是之後才讀到的）
  const latest = useRef({ a11y, say });
  useEffect(() => {
    latest.current = { a11y, say };
  });

  /** 結果出來時焦點會移到結果標題；報讀軟體開著時標題已經會被唸，不再 say（避免唸兩次） */
  const report = useCallback((text: string) => {
    if (!latest.current.a11y.screenReader) latest.current.say(text);
  }, []);

  const showPicker = useCallback(
    (text?: string) => {
      focusLater("picker");
      setPicking(true);
      if (text) report(text);
    },
    [focusLater, report],
  );

  const locate = useCallback(
    async (d: VisionData) => {
      setStatus("locating");
      const pos = await getLocation().catch(() => null);
      const point = pos ? { lat: pos.latitude, lng: pos.longitude } : null;
      const near = point && isInTaipeiArea(point) ? nearestStation(d.stations, point) : null;
      setStatus("ready");
      if (!near) {
        showPicker("沒有拿到您的位置，請選車站。");
        return;
      }
      const next: Answer = { station: near.station, exit: near.exit, distance: near.distance, center: point };
      focusLater("station");
      setPicking(false);
      setAnswer(next);
      report(compose(d, next).speech);
    },
    [focusLater, report, showPicker],
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [facilities, elevators, signals, alerts] = await Promise.allSettled([
        getOpenData("metro-station-facilities", { limit: 1000 }),
        getOpenData("metro-elevators", { limit: 1000 }),
        getOpenData("audible-signals", { limit: 1000 }),
        getOpenData("metro-accessibility-alerts", { limit: 1000 }),
      ]);
      if (cancelled) return;
      if (facilities.status === "rejected" || elevators.status === "rejected") {
        setStatus("error");
        latest.current.say("捷運資料暫時讀不到。請稍後再試，或問站務人員。");
        return;
      }
      const d: VisionData = {
        stations: buildStations(facilities.value.records, elevators.value.records),
        signals: signals.status === "fulfilled" ? signals.value.records : null,
        alerts: alerts.status === "fulfilled" ? alerts.value.records : null,
        sources: [facilities, elevators, alerts, signals].flatMap((r) => (r.status === "fulfilled" ? [r.value.source] : [])),
      };
      setData(d);
      await locate(d);
    })();
    return () => {
      cancelled = true;
    };
  }, [locate]);

  const pickStation = (station: Station) => {
    if (!data) return;
    announce(station.name);
    const next: Answer = { station, center: stationCenter(station) };
    focusLater("station");
    setPicking(false);
    setAnswer(next);
    report(compose(data, next).speech);
  };

  const view = data && answer ? compose(data, answer) : null;
  const groups = data ? stationsByLine(data.stations) : [];
  const lineStations = groups.find((g) => g.line === line)?.stations ?? [];

  return (
    <PageShell title="捷運電梯、有聲號誌">
      {status === "loading" && <p className="text-elder-body text-text-second">正在讀取捷運資料…</p>}
      {status === "locating" && <p className="text-elder-body text-text-second">正在找您附近的捷運站…</p>}
      {status === "error" && (
        <p role="alert" className="text-elder-body font-bold text-text-primary">
          捷運資料暫時讀不到。請稍後再試，或到車站詢問處請站務人員協助。
        </p>
      )}

      {view && answer && !picking && (
        <>
          <section aria-labelledby="station-heading" className="flex flex-col gap-3">
            <h2 id="station-heading" ref={register("station")} tabIndex={-1} className="text-elder-button font-bold text-text-primary focus:outline-none">
              {view.info.headline}
            </h2>
            <ul className="flex flex-col gap-3">
              {view.info.details.map((d) => (
                <li key={d} className="text-elder-body text-text-primary">
                  {d}
                </li>
              ))}
            </ul>
          </section>

          <section aria-labelledby="signal-heading" className="flex flex-col gap-3">
            <h2 id="signal-heading" className="text-elder-button font-bold text-text-primary">
              附近的有聲號誌路口
            </h2>
            {view.signals && view.signals.length > 0 ? (
              <>
                <p className="text-elder-body text-text-second">
                  距離是從{answer.distance !== undefined ? "您的位置" : answer.station.name}算的直線距離。
                </p>
                <ol className="flex list-decimal flex-col gap-2 pl-8">
                  {view.signals.map((s) => (
                    <li key={`${s.name}-${s.lat}`} className="text-elder-body text-text-primary">
                      {s.name}，約 {formatDistance(s.distance)}（{s.district}）
                    </li>
                  ))}
                </ol>
              </>
            ) : (
              <p className="text-elder-body text-text-primary">{signalsSentence(view.signals)}</p>
            )}
          </section>

          <div className="flex flex-col gap-3">
            <button
              type="button"
              onClick={() => {
                announce("再唸一次");
                say(view.speech);
              }}
              className={`${BIG_BUTTON} ${DARK}`}
            >
              <Icon name="ear" className="size-8 shrink-0" />
              再唸一次
            </button>
            <button
              type="button"
              onClick={() => {
                announce("選別的車站");
                showPicker();
              }}
              className={`${BIG_BUTTON} ${PLAIN}`}
            >
              <Icon name="search" className="size-8 shrink-0" />
              選別的車站
            </button>
          </div>
        </>
      )}

      {data && picking && (
        <section aria-labelledby="picker-heading" className="flex flex-col gap-3">
          <h2 id="picker-heading" ref={register("picker")} tabIndex={-1} className="text-elder-button font-bold text-text-primary focus:outline-none">
            選車站
          </h2>
          <p className="text-elder-body text-text-second">先點路線，再點車站。</p>
          <div className="grid grid-cols-2 gap-3">
            {groups.map((g) => (
              <button
                key={g.line}
                type="button"
                aria-pressed={line === g.line}
                onClick={() => {
                  announce(g.line);
                  focusLater("line-stations");
                  setLine(g.line);
                }}
                className={`flex min-h-[4.5rem] items-center justify-center rounded-2xl border-4 bg-white px-3 text-elder-body font-bold text-text-primary ${FOCUS_RING} ${
                  line === g.line ? "border-grayscale-900" : "border-divider"
                }`}
              >
                {g.line}
              </button>
            ))}
          </div>
          {line && (
            <>
              <h3 ref={register("line-stations")} tabIndex={-1} className="text-elder-button font-bold text-text-primary focus:outline-none">
                {line}的車站
              </h3>
              <div className="grid grid-cols-2 gap-3">
                {lineStations.map((s) => (
                  <button
                    key={s.name}
                    type="button"
                    onClick={() => pickStation(s)}
                    className={`flex min-h-[4.5rem] items-center justify-center rounded-2xl px-3 text-elder-body font-bold ${DARK} ${FOCUS_RING}`}
                  >
                    {s.name}
                  </button>
                ))}
              </div>
            </>
          )}
        </section>
      )}

      {data && status === "ready" && (
        <button
          type="button"
          onClick={() => {
            announce("用我的位置找");
            void locate(data);
          }}
          className={`${BIG_BUTTON} ${PLAIN}`}
        >
          <Icon name="home" className="size-8 shrink-0" />
          用我的位置找
        </button>
      )}

      {data && (
        <p className="text-h3 text-text-second">
          資料來自臺北市政府開放資料平臺 data.taipei：
          {data.sources.map((s, i) => (
            <span key={s.id}>
              {i > 0 && "、"}
              <a href={s.url} className="underline underline-offset-2">
                {s.title}
              </a>
            </span>
          ))}
          。距離是直線距離，實際走的路可能比較遠。
        </p>
      )}
    </PageShell>
  );
}
