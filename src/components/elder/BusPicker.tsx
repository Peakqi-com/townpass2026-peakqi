"use client";

import { useState } from "react";
import { busLabel, type BusRoute } from "@/lib/bus/bus";
import { getBusDirections, searchBusRoutes, type BusDirectionView } from "@/lib/bus/client";
import { FAMILY_LIMITS, type FamilyBus } from "@/lib/elder/familyConfig";
import { useElder } from "./ElderProvider";

const INPUT =
  "min-h-[4.5rem] w-full min-w-0 rounded-2xl border-4 border-grayscale-800 bg-white px-4 text-elder-body text-text-primary placeholder:text-text-second";
const FOCUS =
  "outline-offset-2 focus-visible:outline focus-visible:outline-[6px] focus-visible:outline-grayscale-900 active:outline active:outline-[6px] active:outline-grayscale-900";
const OPTION = `flex min-h-[4.5rem] w-full items-center rounded-2xl border-4 border-grayscale-800 bg-white px-4 py-2 text-left text-elder-body font-bold text-text-primary ${FOCUS}`;
const SMALL = `min-h-12 rounded-2xl border-4 border-grayscale-800 bg-white px-4 text-elder-body font-bold text-text-primary ${FOCUS}`;

type Step =
  | { step: "search" }
  | { step: "route"; routes: BusRoute[] }
  | { step: "direction"; route: BusRoute; directions: BusDirectionView[] }
  | { step: "stop"; route: BusRoute; direction: BusDirectionView };

/**
 * M16 家人設定「長輩常坐的公車」：輸入路線 → 選路線 → 選方向 → 選站牌。
 * 存的是 { 市別, 路線代碼, 站牌代碼, 名稱 }，一個站牌代碼就代表「這條路線、這個方向、這一站」。
 * 放在 FamilySetup 的 <form> 裡，所以按鈕一律 type="button"、搜尋框按 Enter 不送出表單。
 */
export function BusPicker({ buses, onChange }: { buses: FamilyBus[]; onChange: (buses: FamilyBus[]) => void }) {
  const { announce, say } = useElder();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [state, setState] = useState<Step>({ step: "search" });

  const reset = () => {
    setState({ step: "search" });
    setQuery("");
    setFilter("");
  };

  const search = async () => {
    const q = query.trim();
    if (!q) return;
    announce(`找 ${q}`);
    setBusy(true);
    try {
      const routes = await searchBusRoutes(q);
      setState({ step: "route", routes });
      const text = routes.length > 0 ? `找到 ${routes.length} 條路線，請選一條` : `找不到「${q}」這條公車。請再確認路線名稱`;
      setMessage(text);
      say(text);
    } catch {
      setMessage("公車資料暫時讀不到，請稍後再試");
      say("公車資料暫時讀不到，請稍後再試");
    } finally {
      setBusy(false);
    }
  };

  const pickRoute = async (route: BusRoute) => {
    announce(route.name);
    setBusy(true);
    try {
      const directions = await getBusDirections(route.city, route.id);
      setState({ step: "direction", route, directions });
      setMessage(`${route.name} 要往哪個方向？`);
      say(`${route.name} 要往哪個方向？`);
    } catch {
      setMessage("站牌資料暫時讀不到，請稍後再試");
      say("站牌資料暫時讀不到，請稍後再試");
    } finally {
      setBusy(false);
    }
  };

  const pickDirection = (route: BusRoute, direction: BusDirectionView) => {
    announce(direction.label);
    setFilter("");
    setState({ step: "stop", route, direction });
    setMessage("長輩在哪一站上車？可以打站名找");
    say("長輩在哪一站上車？可以打站名找");
  };

  const pickStop = (route: BusRoute, direction: BusDirectionView, stop: { id: number; name: string }) => {
    const label = busLabel(route.name, direction.label, stop.name);
    announce(label);
    onChange([...buses, { city: route.city, routeId: route.id, stopId: stop.id, label }]);
    reset();
    setMessage(`加好了：${label}`);
    say(`加好了：${label}`);
  };

  const remove = (index: number) => {
    const bus = buses[index];
    announce(`刪掉 ${bus.label}`);
    onChange(buses.filter((_, i) => i !== index));
    setMessage(`刪掉了：${bus.label}`);
  };

  const full = buses.length >= FAMILY_LIMITS.maxBuses;

  return (
    <fieldset className="flex flex-col gap-3">
      <legend className="mb-3 text-elder-button font-bold text-text-primary">4. 長輩常坐的公車（可以不設）</legend>
      <p className="text-elder-body text-text-second">
        設好後，長輩的首頁會顯示「還有幾分鐘到」。最多 {FAMILY_LIMITS.maxBuses} 組，臺北市、新北市的公車都可以。
      </p>

      {buses.length > 0 && (
        <ul className="flex flex-col gap-2">
          {buses.map((bus, i) => (
            <li key={`${bus.city}-${bus.stopId}`} className="flex items-center justify-between gap-3 rounded-xl bg-bg-dark p-3">
              <span className="text-elder-body font-bold text-text-primary">{bus.label}</span>
              <button type="button" onClick={() => remove(i)} className={SMALL}>
                刪掉
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* 結果用 say() 唸過了，這裡不加 aria-live，避免唸兩次 */}
      {message && <p className="text-elder-body text-text-primary">{message}</p>}

      {!full && state.step === "search" && (
        <div className="flex gap-3">
          <label htmlFor="bus-route" className="sr-only">
            公車路線
          </label>
          <input
            id="bus-route"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                void search();
              }
            }}
            placeholder="路線，例如 307"
            enterKeyHint="search"
            autoComplete="off"
            className={INPUT}
          />
          <button type="button" onClick={() => void search()} disabled={busy} className={`${SMALL} shrink-0 bg-grayscale-800 text-white`}>
            {busy ? "找…" : "找路線"}
          </button>
        </div>
      )}

      {!full && state.step === "route" && (
        <div className="flex flex-col gap-2">
          {state.routes.map((r) => (
            <button key={`${r.city}-${r.id}`} type="button" disabled={busy} onClick={() => void pickRoute(r)} className={OPTION}>
              {r.name}（{r.departure}－{r.destination}）{r.city === "ntpc" ? "・新北市" : ""}
            </button>
          ))}
          <button type="button" onClick={reset} className={SMALL}>
            重新找
          </button>
        </div>
      )}

      {!full && state.step === "direction" && (
        <div className="flex flex-col gap-2">
          {state.directions.map((d) => (
            <button key={d.goBack} type="button" onClick={() => pickDirection(state.route, d)} className={OPTION}>
              {state.route.name} {d.label}
            </button>
          ))}
          <button type="button" onClick={reset} className={SMALL}>
            重新找
          </button>
        </div>
      )}

      {!full && state.step === "stop" && (
        <div className="flex flex-col gap-2">
          <label htmlFor="bus-stop-filter" className="text-elder-body font-bold text-text-primary">
            {state.route.name} {state.direction.label}：在哪一站上車？
          </label>
          <input
            id="bus-stop-filter"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") e.preventDefault();
            }}
            placeholder="打站名的幾個字，例如 三民"
            autoComplete="off"
            className={INPUT}
          />
          <ul className="flex max-h-[28rem] flex-col gap-2 overflow-y-auto">
            {state.direction.stops
              .filter((s) => !filter.trim() || s.name.includes(filter.trim()))
              .map((s) => (
                <li key={s.id}>
                  <button type="button" onClick={() => pickStop(state.route, state.direction, s)} className={OPTION}>
                    {s.name}
                  </button>
                </li>
              ))}
          </ul>
          <button type="button" onClick={reset} className={SMALL}>
            重新找
          </button>
        </div>
      )}
    </fieldset>
  );
}
