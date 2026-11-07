"use client";

import { useEffect, useRef, useState } from "react";
import { getOpenData } from "@/lib/opendata/client";
import { TAIPEI_DISTRICTS, type TaipeiDistrict } from "@/lib/opendata/normalize";
import { osmSearchUrl, userHome, userStreet } from "@/lib/elder/community";
import { HAZARDS, hazardLabel, sheltersFor, toShelter, type Hazard, type Shelter } from "@/lib/elder/shelter";
import { openExternal } from "@/lib/townpass/elder";
import { Icon } from "./Icon";
import { PageShell } from "./PageShell";
import { BIG_BUTTON, FOCUS_RING, PLAIN } from "./PlacesScreen";
import { ServiceLink } from "./ServiceButton";
import { useElder } from "./ElderProvider";
import { FailNote, useFailNote } from "./FailNote";
import { useFocusAfterRender } from "./useFocusAfterRender";

interface Loaded {
  status: "loading" | "done" | "error";
  shelters: Shelter[];
  source?: { title: string; url: string };
}

/**
 * 颱風、地震時去哪裡：用台北通帳號的「里」找出負責的避難收容處所，長輩不用輸入地址。
 * 資料來自 data.taipei〈臺北市可供避難收容處所一覽表〉（經 /api/opendata/shelters 代理）。
 */
export function ShelterScreen() {
  const { user, ready, announce, say, a11y } = useElder();
  const note = useFailNote();
  const home = userHome(user);
  const [chosen, setChosen] = useState<TaipeiDistrict | null>(null);
  const [changing, setChanging] = useState(false);
  const [hazard, setHazard] = useState<Hazard | null>(null);
  const [loaded, setLoaded] = useState<Loaded>({ status: "loading", shelters: [] });
  const { register, focusLater } = useFocusAfterRender();
  // 讀取失敗時要 say()，但讀取只做一次，不能因為 say 改變（換模式、語速）就重抓
  const sayRef = useRef(say);
  useEffect(() => {
    sayRef.current = say;
  }, [say]);

  const district = chosen ?? home?.district ?? null;
  // 自己換到別區時，就不知道住哪一里、哪一條路
  const village = district === home?.district ? home?.village : undefined;
  const street = district === home?.district ? userStreet(user) : undefined;

  // 全市 419 處一次讀進來（約 100 KB），之後換區、換災害都在手機裡篩，不用再連網
  useEffect(() => {
    let cancelled = false;
    getOpenData("shelters", { limit: 1000 })
      .then((res) => {
        if (cancelled) return;
        const shelters = res.records.map(toShelter).filter((s): s is Shelter => s !== null);
        setLoaded({ status: "done", shelters, source: { title: res.source.title, url: res.source.url } });
      })
      .catch(() => {
        if (cancelled) return;
        setLoaded({ status: "error", shelters: [] });
        sayRef.current("避難所的資料暫時讀不到。請稍後再試，或打 1999 問問看。");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const result = district && loaded.status === "done" ? sheltersFor(loaded.shelters, { district, village, hazard, street }) : null;

  const pickHazard = (h: Hazard) => {
    const option = HAZARDS.find((x) => x.id === h)!;
    announce(option.speak);
    setHazard(h);
    if (!district || loaded.status !== "done") return;
    const r = sheltersFor(loaded.shelters, { district, village, hazard: h, street });
    const first = r.mine[0] ?? r.others[0];
    focusLater("results");
    const text = first
      ? `${option.speak}，可以去${first.name}，${first.address}`
      : `${district}的資料裡沒有${option.label}可以去的地方。請打 1999 問問看。`;
    if (!a11y.screenReader) say(text);
  };

  const pickDistrict = (d: TaipeiDistrict) => {
    announce(d);
    setChosen(d);
    setChanging(false);
    focusLater(hazard ? "results" : "hazard");
  };

  const goThere = async (s: Shelter) => {
    announce("怎麼去");
    note.clear();
    if (!(await openExternal(osmSearchUrl(s)))) note.fail("地圖打不開。可以把地址給家人或計程車司機看。", s.key);
  };

  const card = (s: Shelter, mine: boolean) => (
    <li key={s.key}>
      <article className="flex flex-col gap-3 rounded-2xl border-4 border-divider bg-white p-4">
        <h3 ref={register(s.key)} tabIndex={-1} className="text-elder-button font-bold text-text-primary focus:outline-none">
          {s.name}
        </h3>
        {mine && <p className="text-elder-body font-bold text-text-primary">負責您住的{village}</p>}
        <p className="text-elder-body text-text-primary">地址：{s.address}</p>
        <ul className="flex flex-col gap-1 rounded-xl bg-bg-dark p-3 text-elder-body text-text-primary">
          <li>颱風、淹水：{hazardLabel(s.flood)}</li>
          <li>地震：{hazardLabel(s.quake)}</li>
          <li>{s.accessible ? "有無障礙設施" : "資料寫沒有無障礙設施"}</li>
          {s.indoor && <li>有室內空間</li>}
        </ul>
        <button type="button" onClick={() => void goThere(s)} className={`${BIG_BUTTON} ${PLAIN}`}>
          <Icon name="search" className="size-8 shrink-0" />
          怎麼去
        </button>
        <FailNote message={note.at(s.key)} />
      </article>
    </li>
  );

  return (
    <PageShell title="颱風、地震時去哪裡">
      <p className="text-elder-body text-text-primary">市政府登記的避難收容處所。真的要去之前，請以市政府當時的公告為準。</p>

      {!ready ? (
        <p className="text-elder-body text-text-second">正在讀取您的資料…</p>
      ) : district && !changing ? (
        <section aria-labelledby="home-heading" className="flex flex-col gap-3">
          <h2 id="home-heading" ref={register("home")} tabIndex={-1} className="text-elder-button font-bold text-text-primary focus:outline-none">
            您住在{district}
            {village ?? ""}
          </h2>
          <p className="text-elder-body text-text-second">{chosen ? "這是您選的行政區。" : "依台北通帳號的地址。"}</p>
          <button
            type="button"
            onClick={() => {
              announce("換一區");
              focusLater("district");
              setChanging(true);
            }}
            className={`${BIG_BUTTON} ${PLAIN}`}
          >
            換一區
          </button>
        </section>
      ) : (
        <section aria-labelledby="district-heading" className="flex flex-col gap-3">
          <h2 id="district-heading" ref={register("district")} tabIndex={-1} className="text-elder-button font-bold text-text-primary focus:outline-none">
            您住在哪一區？
          </h2>
          {!district && <p className="text-elder-body text-text-second">台北通帳號裡沒有臺北市的地址，請點一下您住的區。</p>}
          <div className="grid grid-cols-2 gap-3">
            {TAIPEI_DISTRICTS.map((d) => (
              <button
                key={d}
                type="button"
                aria-pressed={district === d}
                onClick={() => pickDistrict(d)}
                className={`flex min-h-[4.5rem] items-center justify-center rounded-2xl border-4 bg-white px-3 text-elder-body font-bold text-text-primary ${FOCUS_RING} ${
                  district === d ? "border-grayscale-900" : "border-divider"
                }`}
              >
                {d}
              </button>
            ))}
          </div>
        </section>
      )}

      {ready && district && (
        <section aria-labelledby="hazard-heading" className="flex flex-col gap-3">
          <h2 id="hazard-heading" ref={register("hazard")} tabIndex={-1} className="text-elder-button font-bold text-text-primary focus:outline-none">
            遇到什麼狀況？
          </h2>
          <div className="grid grid-cols-2 gap-3">
            {HAZARDS.map((h) => (
              <button
                key={h.id}
                type="button"
                aria-pressed={hazard === h.id}
                onClick={() => pickHazard(h.id)}
                className={`flex min-h-[4.5rem] items-center justify-center rounded-2xl bg-grayscale-800 px-3 py-3 text-elder-button font-bold text-white ${FOCUS_RING} ${
                  hazard === h.id ? "outline outline-[6px] outline-grayscale-900" : ""
                }`}
              >
                {h.label}
              </button>
            ))}
          </div>
        </section>
      )}

      {district && hazard && (
        <section aria-labelledby="results-heading" className="flex flex-col gap-4">
          <h2 id="results-heading" ref={register("results")} tabIndex={-1} className="text-elder-button font-bold text-text-primary focus:outline-none">
            {loaded.status === "loading"
              ? "正在找避難的地方…"
              : loaded.status === "error"
                ? "資料暫時讀不到"
                : `${HAZARDS.find((h) => h.id === hazard)!.label}可以去的地方`}
          </h2>

          {loaded.status === "error" && <p className="text-elder-body text-text-primary">請稍後再試一次，或打 1999 問問看。</p>}

          {result && result.mine.length === 0 && result.others.length === 0 && (
            <p className="text-elder-body text-text-primary">{district}的資料裡沒有。請打 1999 問問看。</p>
          )}

          {result && result.mine.length > 0 && (
            <>
              <p className="text-elder-body text-text-second">負責{village}的有 {result.mine.length} 處，有無障礙設施的排在前面。</p>
              <ul className="flex flex-col gap-4">{result.mine.map((s) => card(s, true))}</ul>
            </>
          )}

          {result && result.others.length > 0 && (
            <details className="rounded-2xl border-4 border-divider p-4" open={result.mine.length === 0}>
              <summary className={`min-h-12 cursor-pointer text-elder-button font-bold text-text-primary ${FOCUS_RING}`}>
                {district}其他 {result.others.length} 處
              </summary>
              <ul className="mt-4 flex flex-col gap-4">{result.others.map((s) => card(s, false))}</ul>
            </details>
          )}

          {loaded.source && (
            <p className="text-h3 text-text-second">
              資料來自臺北市政府開放資料平臺 data.taipei：
              <a href={loaded.source.url} className="underline underline-offset-2">
                {loaded.source.title}
              </a>
              （教育局）。「怎麼去」會用 OpenStreetMap 找到那條路，門牌號碼請看上面的地址。
            </p>
          )}
        </section>
      )}

      <ServiceLink href="/help" label="緊急求助" speak="緊急求助" icon="help" row className="bg-elder-help text-on-elder-help" />
    </PageShell>
  );
}
