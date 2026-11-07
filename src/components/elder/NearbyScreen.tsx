"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getOpenData } from "@/lib/opendata/client";
import { isInTaipeiArea, type LatLng } from "@/lib/opendata/geo";
import { userHome } from "@/lib/elder/community";
import {
  NEARBY_KINDS,
  inDistrict,
  nearbyHeadline,
  osmPointUrl,
  pickPlaces,
  type NearbyKind,
  type NearbyPlace,
} from "@/lib/elder/nearby";
import { formatDistance } from "@/lib/elder/places";
import type { TaipeiDistrict } from "@/lib/opendata/normalize";
import { getLocation } from "@/lib/townpass/bridge";
import { openExternal } from "@/lib/townpass/elder";
import { Icon } from "./Icon";
import { PageShell } from "./PageShell";
import { BIG_BUTTON, FOCUS_RING, PLAIN } from "./PlacesScreen";
import { useElder } from "./ElderProvider";
import { FailNote, useFailNote } from "./FailNote";
import { useFocusAfterRender } from "./useFocusAfterRender";

/** 用位置找時的範圍（公尺）。走路 15 分鐘左右 */
const RADIUS = 1500;
const DARK = "bg-grayscale-800 text-white";

interface Result {
  kind: NearbyKind;
  places: NearbyPlace[];
  headline: string;
  /** 依位置找（有距離），或依行政區列出 */
  by: "location" | "district";
  district?: TaipeiDistrict;
  source: { title: string; url: string };
}

/**
 * M17 附近哪裡可以用：無障礙廁所、捷運電梯、哺集乳室、親子廁所、AED。
 *
 * 給坐輪椅、拿拐杖、懷孕、受傷，或陪家人出門的時候。和 M10 一樣只有文字、沒有地圖：
 * 結果的標題就是重點（最近的是哪裡、多遠），細節往下排，報讀軟體用標題跳讀就能聽到。
 * 拿不到位置、或資料沒有座標（哺集乳室）時，改用台北通帳號的行政區列出。
 */
export function NearbyScreen() {
  const { user, a11y, say, announce } = useElder();
  const note = useFailNote();
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [result, setResult] = useState<Result | null>(null);
  const [chosen, setChosen] = useState<NearbyKind | null>(null);
  const request = useRef(0);
  const { register, focusLater } = useFocusAfterRender();
  const home = userHome(user);

  // 非同步流程裡要用最新的 a11y／say（報讀軟體狀態是之後才讀到的）
  const latest = useRef({ a11y, say });
  useEffect(() => {
    latest.current = { a11y, say };
  });

  /** 結果出來時焦點會移到結果標題；報讀軟體開著時標題已經會被唸，不再 say（避免唸兩次） */
  const report = useCallback((text: string) => {
    if (!latest.current.a11y.screenReader) latest.current.say(text);
  }, []);

  const find = async (kind: NearbyKind) => {
    const id = ++request.current;
    note.clear();
    setChosen(kind);
    setStatus("loading");
    setResult(null);
    try {
      let center: LatLng | null = null;
      if (kind.located) {
        const pos = await getLocation().catch(() => null);
        const point = pos ? { lat: pos.latitude, lng: pos.longitude } : null;
        if (point && isInTaipeiArea(point)) center = point;
      }

      let next: Result;
      if (center) {
        const res = await getOpenData(kind.source, { near: center, radius: RADIUS, limit: 300 });
        const places = pickPlaces(kind.id, res.records);
        next = { kind, places, by: "location", headline: nearbyHeadline(kind, places, { radius: RADIUS }), source: res.source };
      } else if (home) {
        const res = await getOpenData(kind.source, { limit: 1000 });
        const rows = inDistrict(kind.id, res.records, home.district);
        const places = pickPlaces(kind.id, rows);
        const total = pickPlaces(kind.id, rows, Infinity).length;
        const prefix = kind.located ? "沒有拿到您的位置，先列出您住的區。" : "";
        next = {
          kind,
          places,
          by: "district",
          district: home.district,
          headline: prefix + nearbyHeadline(kind, places, { district: home.district, total }),
          source: res.source,
        };
      } else {
        if (id !== request.current) return;
        setStatus("error");
        note.fail("沒有拿到您的位置。請到手機的設定打開台北通的定位，再試一次。", "locate");
        return;
      }

      if (id !== request.current) return;
      focusLater("result");
      setResult(next);
      setStatus("ready");
      report(next.headline);
    } catch {
      if (id !== request.current) return;
      setStatus("error");
      note.fail("資料暫時讀不到。請稍後再試，或打 1999 問。", "locate");
    }
  };

  const goTo = async (place: NearbyPlace) => {
    announce("怎麼去");
    note.clear();
    const url = osmPointUrl(place);
    if (!url || !(await openExternal(url))) {
      note.fail("地圖打不開。可以把地址給家人或計程車司機看。", place.key);
    }
  };

  return (
    <PageShell title="附近哪裡可以用">
      <p className="text-elder-body text-text-primary">坐輪椅、拿拐杖、懷孕、受傷，或陪家人出門的時候，找最近可以用的地方。</p>

      <section aria-labelledby="kind-heading" className="flex flex-col gap-3">
        <h2 id="kind-heading" className="text-elder-button font-bold text-text-primary">
          要找什麼？
        </h2>
        <div className="flex flex-col gap-3">
          {NEARBY_KINDS.map((k) => (
            <button
              key={k.id}
              type="button"
              aria-pressed={chosen?.id === k.id}
              onClick={() => {
                announce(k.speak);
                void find(k);
              }}
              className={`flex min-h-[4.5rem] w-full flex-col items-start justify-center gap-1 rounded-2xl border-4 px-5 py-3 text-left text-text-primary ${FOCUS_RING} ${
                chosen?.id === k.id ? "border-grayscale-900 bg-grayscale-50" : "border-divider bg-white"
              }`}
            >
              <span className="text-elder-button font-bold">{k.label}</span>
              <span className="text-elder-body text-text-second">{k.who}</span>
            </button>
          ))}
        </div>
        <FailNote message={note.at("locate")} />
      </section>

      {status === "loading" && chosen && (
        <p className="text-elder-body text-text-second">
          {chosen.located ? "正在找您附近的" : "正在找"}
          {chosen.label}…
        </p>
      )}

      {result && status === "ready" && (
        <section aria-labelledby="result-heading" className="flex flex-col gap-4">
          <h2 id="result-heading" ref={register("result")} tabIndex={-1} className="text-elder-button font-bold text-text-primary focus:outline-none">
            {result.headline}
          </h2>
          {result.places.length > 0 ? (
            <ol className="flex flex-col gap-4">
              {result.places.map((p, i) => (
                <li key={p.key} className="flex flex-col gap-2 rounded-2xl border-4 border-divider bg-white p-4">
                  <h3 className="text-elder-body font-bold text-text-primary">
                    {i + 1}. {p.name}
                    {p.distance !== undefined && `，約 ${formatDistance(p.distance)}`}
                  </h3>
                  {p.address && <p className="text-elder-body text-text-primary">{p.address}</p>}
                  {p.details.map((d) => (
                    <p key={d} className="text-elder-body text-text-second">
                      {d}
                    </p>
                  ))}
                  {p.phone && <p className="text-elder-body text-text-primary">電話：{p.phone}</p>}
                  {osmPointUrl(p) && (
                    <>
                      <button type="button" onClick={() => void goTo(p)} className={`${BIG_BUTTON} ${PLAIN}`}>
                        <Icon name="search" className="size-8 shrink-0" />
                        怎麼去
                      </button>
                      <FailNote message={note.at(p.key)} />
                    </>
                  )}
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-elder-body text-text-primary">可以換別的類別找找看，或打 1999 問。</p>
          )}

          <button
            type="button"
            onClick={() => {
              announce("再唸一次");
              say(result.headline);
            }}
            className={`${BIG_BUTTON} ${DARK}`}
          >
            <Icon name="ear" className="size-8 shrink-0" />
            再唸一次
          </button>

          <p className="text-h3 text-text-second">
            資料來自臺北市政府開放資料平臺 data.taipei：
            <a href={result.source.url} className="underline underline-offset-2">
              {result.source.title}
            </a>
            。
            {result.by === "location"
              ? "距離是直線距離，實際走的路可能比較遠。"
              : `依您台北通帳號的行政區（${result.district}）列出。`}
            實際開放情形以現場為準。
          </p>
        </section>
      )}
    </PageShell>
  );
}
