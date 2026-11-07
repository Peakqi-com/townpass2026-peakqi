"use client";

import { useRef, useState } from "react";
import { getOpenData } from "@/lib/opendata/client";
import { TAIPEI_DISTRICTS, type TaipeiDistrict } from "@/lib/opendata/normalize";
import {
  COMMUNITY_CATEGORIES,
  osmSearchUrl,
  placesInDistrict,
  toCommunityPlace,
  userHome,
  type CommunityCategory,
  type CommunityCategoryId,
  type CommunityPlace,
  type Phone,
} from "@/lib/elder/community";
import { phoneCall } from "@/lib/townpass/bridge";
import { openExternal } from "@/lib/townpass/elder";
import { Icon } from "./Icon";
import { PageShell } from "./PageShell";
import { ServiceAction } from "./ServiceButton";
import { useElder } from "./ElderProvider";
import { useFocusAfterRender } from "./useFocusAfterRender";

/** 一次顯示幾筆（長輩一次看太多會找不到；報讀軟體也比較好跳讀） */
const PAGE = 10;

const FOCUS_RING =
  "outline-offset-2 focus-visible:outline focus-visible:outline-[6px] focus-visible:outline-grayscale-900 active:outline active:outline-[6px] active:outline-grayscale-900";
const BIG_BUTTON = `flex min-h-[4.5rem] w-full items-center justify-center gap-3 rounded-2xl px-5 py-3 text-center text-elder-button font-bold ${FOCUS_RING}`;
const PLAIN = "border-4 border-grayscale-800 bg-white text-text-primary";

type Place = CommunityPlace & { sameVillage: boolean };

interface Result {
  status: "loading" | "done" | "error";
  places: Place[];
  source?: { title: string; url: string };
}

/**
 * M9 附近吃飯上課：依台北通帳號的行政區，列出同區的共餐、關懷據點、長青學苑、樂齡學習。
 * 資料來自 data.taipei（經過 /api/opendata 代理），電話不在服務清單裡，所以撥打前一定先顯示大字確認。
 */
export function CommunityScreen() {
  const { mode, user, ready, announce, say, a11y } = useElder();
  const hearing = mode === "hearing";
  const home = userHome(user);
  const [chosen, setChosen] = useState<TaipeiDistrict | null>(null);
  const [changing, setChanging] = useState(false);
  const [category, setCategory] = useState<CommunityCategoryId | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [shown, setShown] = useState(PAGE);
  const [calling, setCalling] = useState<{ place: Place; phone: Phone } | null>(null);
  const cache = useRef(new Map<string, Result>());
  const request = useRef(0);
  const { register, focusLater } = useFocusAfterRender();

  const district = chosen ?? home?.district ?? null;
  // 自己換到別區時，就不用帳號的里來排序
  const village = district === home?.district ? home?.village : undefined;
  const current = COMMUNITY_CATEGORIES.find((c) => c.id === category) ?? null;

  /** 讀取某一區、某一類的據點。focusResults：結果出來後把焦點移到結果標題（換區時用） */
  const load = async (cat: CommunityCategory, d: TaipeiDistrict, focusResults: boolean) => {
    const id = ++request.current;
    setShown(PAGE);
    const key = `${cat.id}|${d}`;
    let next = cache.current.get(key);
    if (!next) {
      setResult({ status: "loading", places: [] });
      try {
        const res = await getOpenData(cat.source, { q: d, limit: 1000 });
        const places = placesInDistrict(
          res.records.map((r) => toCommunityPlace(cat.id, r)),
          d,
          d === home?.district ? home?.village : undefined,
        );
        next = { status: "done", places, source: { title: res.source.title, url: res.source.url } };
        cache.current.set(key, next);
      } catch {
        next = { status: "error", places: [] };
      }
    }
    if (id !== request.current) return; // 使用者已經換了別的選項
    const text =
      next.status === "error"
        ? "資料暫時讀不到。請稍後再試，或打 1999 問問看。"
        : next.places.length > 0
          ? `${d}有 ${next.places.length} 個${cat.label}`
          : `${d}的資料裡沒有${cat.label}。可以換一類看看。`;
    if (focusResults) {
      focusLater("results");
      setResult(next);
      if (!a11y.screenReader) say(text);
    } else {
      setResult(next);
      say(text);
    }
  };

  const pickDistrict = (d: TaipeiDistrict) => {
    announce(d);
    setChosen(d);
    setChanging(false);
    if (current) {
      void load(current, d, true);
    } else {
      focusLater("home");
    }
  };

  const pickCategory = (cat: CommunityCategory) => {
    announce(cat.speak);
    setCategory(cat.id);
    if (district) void load(cat, district, false);
  };

  const showMore = () => {
    if (!result) return;
    announce("再看 10 個");
    focusLater(result.places[shown]?.key ?? "results");
    setShown((n) => n + PAGE);
  };

  const startCall = (place: Place, phone: Phone) => {
    announce(`打給${place.name}`);
    focusLater("call");
    setCalling({ place, phone });
  };

  const cancelCall = () => {
    if (calling) focusLater(calling.place.key);
    setCalling(null);
  };

  const goThere = async (place: Place) => {
    announce("怎麼去");
    if (!(await openExternal(osmSearchUrl(place)))) say("地圖打不開。可以把地址給家人或計程車司機看。");
  };

  const openSite = async (place: Place) => {
    if (!place.url) return;
    announce("看網站");
    if (!(await openExternal(place.url))) say("網站打不開。請改打電話，或請家人幫忙。");
  };

  if (calling) {
    const { place, phone } = calling;
    return (
      <PageShell title="附近吃飯、上課">
        <section aria-labelledby="call-heading" className="flex flex-col gap-4">
          <h2 id="call-heading" ref={register("call")} tabIndex={-1} className="text-elder-title font-bold text-text-primary focus:outline-none">
            打給{place.name}
          </h2>
          <p className="text-[2.5rem] font-bold leading-tight text-text-primary">{phone.display}</p>
          {phone.ext && <p className="text-elder-body font-bold text-text-primary">接通後，請說要轉分機 {phone.ext}。</p>}
          {hearing && (
            <p className="rounded-2xl bg-bg-dark p-4 text-elder-body text-text-primary">
              這支電話只能用講的。可以請家人代打，或改用文字問 1999。
            </p>
          )}
          <ServiceAction
            label={`撥打 ${phone.display}`}
            speak={`撥打${place.name}`}
            icon="phone"
            row
            className="bg-grayscale-800 text-white"
            onPress={async () => {
              if (!(await phoneCall(phone.dial))) say("這支手機不能撥電話。請改用其他方式，或請家人幫忙。");
            }}
          />
          <ServiceAction label="不打了，回到列表" icon="home" row className={PLAIN} onPress={cancelCall} />
          <p className="text-h3 text-text-second">
            電話來自政府開放資料{result?.source ? `〈${result.source.title}〉` : ""}，可能已經改號，請以現場為準。
          </p>
        </section>
      </PageShell>
    );
  }

  const visible = result?.places.slice(0, shown) ?? [];
  const remaining = (result?.places.length ?? 0) - visible.length;

  return (
    <PageShell title="附近吃飯、上課">
      {!ready ? (
        <p className="text-elder-body text-text-second">正在讀取您的資料…</p>
      ) : district && !changing ? (
        <section aria-labelledby="home-heading" className="flex flex-col gap-3">
          <h2 id="home-heading" ref={register("home")} tabIndex={-1} className="text-elder-button font-bold text-text-primary focus:outline-none">
            您住在{district}
          </h2>
          <p className="text-elder-body text-text-second">
            {chosen ? "這是您選的行政區。" : "依台北通帳號的地址。"}想看別區，可以換。
          </p>
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
        <section aria-labelledby="category-heading" className="flex flex-col gap-3">
          <h2 id="category-heading" className="text-elder-button font-bold text-text-primary">
            要找哪一種？
          </h2>
          <div className="grid grid-cols-2 gap-3">
            {COMMUNITY_CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                type="button"
                aria-pressed={category === cat.id}
                onClick={() => pickCategory(cat)}
                className={`flex min-h-[4.5rem] flex-col items-center justify-center gap-1 rounded-2xl bg-elder-community px-3 py-3 text-elder-body font-bold text-on-elder-community ${FOCUS_RING} ${
                  category === cat.id ? "outline outline-[6px] outline-grayscale-900" : ""
                }`}
              >
                <Icon name="community" className="size-8 shrink-0" />
                {cat.label}
              </button>
            ))}
          </div>
          {current && <p className="text-elder-body text-text-second">{current.description}</p>}
        </section>
      )}

      {district && current && result && (
        <section aria-labelledby="results-heading" className="flex flex-col gap-4">
          <h2 id="results-heading" ref={register("results")} tabIndex={-1} className="text-elder-button font-bold text-text-primary focus:outline-none">
            {result.status === "loading"
              ? `正在找${district}的${current.label}…`
              : result.status === "error"
                ? "資料暫時讀不到"
                : `${district}的${current.label}：${result.places.length} 個`}
          </h2>

          {result.status === "error" && (
            <p className="text-elder-body text-text-primary">請稍後再試一次，或打 1999 問問看。</p>
          )}
          {result.status === "done" && result.places.length === 0 && (
            <p className="text-elder-body text-text-primary">這一區的資料裡沒有{current.label}。可以換一類，或打 1999 問問看。</p>
          )}
          {result.status === "done" && result.places.length > 0 && (
            <>
              <p className="text-elder-body text-text-second">
                {village && result.places.some((p) => p.sameVillage) ? `跟您同一里（${village}）的排在最前面。` : ""}
                按電話會先問您要不要打。
              </p>
              {hearing && (
                <p className="rounded-2xl bg-bg-dark p-4 text-elder-body text-text-primary">
                  這些地方大多只能打電話。可以請家人代打，或改用文字問 1999。
                </p>
              )}
            </>
          )}

          <ul className="flex flex-col gap-4">
            {visible.map((place) => (
              <li key={place.key}>
                <article className="flex flex-col gap-3 rounded-2xl border-4 border-divider bg-white p-4">
                  <h3 ref={register(place.key)} tabIndex={-1} className="text-elder-button font-bold text-text-primary focus:outline-none">
                    {place.name}
                  </h3>
                  {place.sameVillage && <p className="text-elder-body font-bold text-text-primary">跟您同一里</p>}
                  <p className="text-elder-body text-text-primary">地址：{place.address}</p>
                  {place.note && <p className="text-elder-body text-text-second">{place.note}</p>}

                  {place.phones.map((phone) => (
                    <button
                      key={`${phone.dial}-${phone.ext ?? ""}`}
                      type="button"
                      onClick={() => startCall(place, phone)}
                      className={`${BIG_BUTTON} bg-elder-community text-on-elder-community`}
                    >
                      <Icon name="phone" className="size-8 shrink-0" />
                      <span>
                        撥打 {phone.display}
                        {phone.ext && <span className="block text-elder-body">分機 {phone.ext}</span>}
                      </span>
                    </button>
                  ))}
                  {place.phones.length === 0 && (
                    <p className="text-elder-body text-text-primary">
                      電話：{place.phoneNote ?? "資料裡沒有"}（不能直接撥打）
                    </p>
                  )}

                  <button type="button" onClick={() => void goThere(place)} className={`${BIG_BUTTON} ${PLAIN}`}>
                    <Icon name="search" className="size-8 shrink-0" />
                    怎麼去
                  </button>
                  {place.url && (
                    <button type="button" onClick={() => void openSite(place)} className={`${BIG_BUTTON} ${PLAIN}`}>
                      <Icon name="text" className="size-8 shrink-0" />
                      看網站
                    </button>
                  )}

                  {result.source && (
                    <p className="text-h3 text-text-second">
                      資料來源：{current.owner}〈{result.source.title}〉
                    </p>
                  )}
                </article>
              </li>
            ))}
          </ul>

          {remaining > 0 && (
            <button type="button" onClick={showMore} className={`${BIG_BUTTON} ${PLAIN}`}>
              再看 {Math.min(PAGE, remaining)} 個（還有 {remaining} 個）
            </button>
          )}

          {result.source && (
            <p className="text-h3 text-text-second">
              資料來自臺北市政府開放資料平臺 data.taipei：
              <a href={result.source.url} className="underline underline-offset-2">
                {result.source.title}
              </a>
              。「怎麼去」會用 OpenStreetMap 找到那條路或巷子，門牌號碼請看上面的地址。
            </p>
          )}
        </section>
      )}
    </PageShell>
  );
}
