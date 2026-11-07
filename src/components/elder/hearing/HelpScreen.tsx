"use client";

import { useRef, useState } from "react";
import { FAX_119, HELP_CARDS, KEYPAD_119_SOURCE, SMS_110, SMS_119, type HelpCard } from "@/lib/elder/hearing";
import {
  ageOn,
  build119Sms,
  formatMobile,
  formatPosition,
  genderFromIdNo,
  smsUri,
  type EmergencyKind,
  type LatLng,
} from "@/lib/elder/messages";
import { getService } from "@/lib/elder/services";
import { getLocation } from "@/lib/townpass/bridge";
import { openExternal } from "@/lib/townpass/elder";
import { useElder } from "../ElderProvider";
import { FailNote, useFailNote } from "../FailNote";
import { PageShell } from "../PageShell";
import { ServiceAction } from "../ServiceButton";
import { ServiceCard } from "../ServiceCard";
import { useRunAction } from "../useRunAction";
import { CopyButton, FullScreenCard, INPUT, LABEL, SECONDARY_BUTTON, SourceList, toggleClass } from "./parts";

const KINDS: { kind: Exclude<EmergencyKind, "police">; label: string }[] = [
  { kind: "fire", label: "火災" },
  { kind: "injury", label: "受傷、受困" },
  { kind: "sick", label: "生病" },
];

/**
 * /help 求助（M8）：撥 119、給旁人看的求助卡、119／110 簡訊範本、165 防詐騙。
 * ⚠️ 原則 9：不在 Demo 送出真實求救。簡訊只打開簡訊 App，由使用者自己按送出。
 */
export function HelpScreen() {
  const { mode, a11y, user, now, announce, say } = useElder();
  const run = useRunAction();
  const note = useFailNote();
  const hearing = mode === "hearing";
  const emergency = getService("emergency-119");
  const antifraud = getService("antifraud-165");

  const [card, setCard] = useState<HelpCard | null>(null);
  const [kind, setKind] = useState<Exclude<EmergencyKind, "police">>("sick");
  const [address, setAddress] = useState("");
  const [clothing, setClothing] = useState("");
  const [position, setPosition] = useState<LatLng | null>(null);
  const [locating, setLocating] = useState(false);
  const smsHeading = useRef<HTMLHeadingElement>(null);

  const who = {
    name: user?.realName,
    gender: user ? genderFromIdNo(user.idNo) : null,
    age: user && now ? ageOn(user.birthday, now) : null,
  };
  const message = build119Sms({ kind, ...who, address, position, clothing });
  const message110 = build119Sms({ kind: "police", ...who, address, position });

  const locate = async () => {
    announce("帶入我現在的位置");
    setLocating(true);
    note.clear();
    try {
      const pos = await getLocation();
      if (pos && formatPosition(pos)) {
        setPosition({ latitude: pos.latitude, longitude: pos.longitude });
        say("找到位置了，已經放進簡訊。");
      } else {
        note.fail("拿不到位置。請自己填地址或附近的地標。", "locate");
      }
    } catch {
      note.fail("拿不到位置。請自己填地址或附近的地標。", "locate");
    } finally {
      setLocating(false);
    }
  };

  const openSms = async (number: string, body: string) => {
    announce(`打開簡訊，傳給 ${formatMobile(number)}`);
    note.clear();
    if (!(await openExternal(smsUri(number, body)))) note.fail("打不開簡訊。請把內容複製起來，或請旁人幫忙。", number);
  };

  const call119 = emergency && (
    <ServiceAction
      key="call"
      onPress={() => void run(emergency, emergency.action)}
      label="撥 119"
      speak="撥 119"
      icon="phone"
      row
      className="bg-elder-help text-on-elder-help"
    />
  );
  const sms119 = (
    <ServiceAction
      key="sms"
      onPress={() => {
        smsHeading.current?.scrollIntoView({ block: "start" });
        smsHeading.current?.focus({ preventScroll: true });
        // 焦點已經移到標題，報讀軟體會唸標題；開著報讀軟體時不要再 say，免得唸兩次
        if (!a11y.screenReader) say("下面是 119 簡訊範本");
      }}
      label="用簡訊報 119"
      icon="text"
      row
      className="bg-elder-hearing text-on-elder-hearing"
    />
  );

  return (
    <PageShell title="求助">
      <p className="text-elder-body text-text-primary">很緊急就打 119。聽不到的話，用下面的求助卡或簡訊。</p>

      {/* 原則 4：打電話與用文字兩個按鈕一樣大、並排；聽不清楚模式文字排前面 */}
      <div className="flex flex-col gap-3">{hearing ? [sms119, call119] : [call119, sms119]}</div>
      <p className="text-h3 text-text-second">按「撥 119」會先出現大字確認，不會直接撥出。</p>

      <section aria-labelledby="cards-heading" className="flex flex-col gap-3">
        <h2 id="cards-heading" className="text-elder-button font-bold text-text-primary">
          給旁人看的求助卡
        </h2>
        <p className="text-elder-body text-text-second">點一張，會用全螢幕大字顯示，把手機轉給旁人看。</p>
        <div className="flex flex-col gap-3">
          {HELP_CARDS.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => {
                announce(c.text);
                setCard(c);
              }}
              className={SECONDARY_BUTTON}
            >
              {c.text}
            </button>
          ))}
        </div>
      </section>

      <section aria-labelledby="sms-heading" className="flex flex-col gap-4">
        <h2 id="sms-heading" ref={smsHeading} tabIndex={-1} className="text-elder-button font-bold text-text-primary focus:outline-none">
          119 簡訊範本
        </h2>
        <p className="text-elder-body text-text-second">照臺北市消防局的範本寫好了，按下面的按鈕會打開簡訊，您自己按送出。</p>

        <fieldset className="flex flex-col gap-2">
          <legend className={`${LABEL} mb-2`}>發生什麼事？</legend>
          <div className="grid grid-cols-3 gap-2">
            {KINDS.map((k) => (
              <button
                key={k.kind}
                type="button"
                aria-pressed={kind === k.kind}
                onClick={() => {
                  announce(k.label);
                  setKind(k.kind);
                }}
                className={toggleClass(kind === k.kind)}
              >
                {kind === k.kind && <span aria-hidden="true">✓</span>}
                {k.label}
              </button>
            ))}
          </div>
        </fieldset>

        <div className="flex flex-col gap-2">
          <p className={LABEL}>在哪裡？</p>
          <button type="button" onClick={locate} disabled={locating} className={SECONDARY_BUTTON}>
            {locating ? "正在找位置…" : position ? "✓ 已帶入位置（再按一次更新）" : "帶入我現在的位置"}
          </button>
          <FailNote message={note.at("locate")} />
          {position && <p className="text-elder-body text-text-primary">GPS：{formatPosition(position)}</p>}
          {user?.residentAddress && (
            <button
              type="button"
              onClick={() => {
                announce("我在家");
                setAddress(user.residentAddress);
                note.clear();
                say("已經填入家裡地址。");
              }}
              className={SECONDARY_BUTTON}
            >
              我在家（填入家裡地址）
            </button>
          )}
          <label htmlFor="sms-address" className={LABEL}>
            地址或附近的地標
          </label>
          <input
            id="sms-address"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="例如：捷運市政府站 2 號出口"
            className={INPUT}
          />
        </div>

        {kind !== "fire" && (
          <div className="flex flex-col gap-2">
            <label htmlFor="sms-clothing" className={LABEL}>
              衣服顏色或特徵（可以不填）
            </label>
            <input
              id="sms-clothing"
              value={clothing}
              onChange={(e) => setClothing(e.target.value)}
              placeholder="例如：紅色外套"
              className={INPUT}
            />
          </div>
        )}

        <div className="flex flex-col gap-2">
          <p className={LABEL}>簡訊內容</p>
          <p className="whitespace-pre-wrap break-words rounded-2xl border-4 border-grayscale-800 bg-bg-dark p-4 text-elder-button font-bold text-text-primary">
            {message}
          </p>
          <CopyButton text={message} label="複製簡訊內容" done="複製好了，可以貼到簡訊。" />
        </div>

        <div role="note" className="flex flex-col gap-2 rounded-2xl border-4 border-alarm bg-white p-4 text-elder-body text-text-primary">
          <p className="font-bold">⚠️ 119 簡訊號碼有兩個官方版本，待確認</p>
          <p>正式使用前，請先打電話向臺北市消防局確認現在用哪一支。</p>
          <p className="font-bold">Demo 時不要真的送出。按下面的按鈕只會打開簡訊 App，不會自動送出。</p>
        </div>

        {SMS_119.map((n) => (
          <div key={n.number} className="flex flex-col gap-2 rounded-2xl border-4 border-divider p-4">
            <p className="text-elder-button font-bold text-text-primary">
              {formatMobile(n.number)}
              {n.pending && <span className="ml-2 text-elder-body">（待確認）</span>}
            </p>
            {n.backup && <p className="text-elder-body text-text-second">同一份資料的備用號碼：{formatMobile(n.backup)}</p>}
            <button type="button" onClick={() => openSms(n.number, message)} className={SECONDARY_BUTTON}>
              打開簡訊，傳給 {formatMobile(n.number)}
            </button>
            <FailNote message={note.at(n.number)} />
            <SourceList sources={n.sources} />
          </div>
        ))}

        <div className="flex flex-col gap-2 rounded-2xl bg-bg-dark p-4 text-elder-body text-text-primary">
          <h3 className="font-bold">其他不用講話的 119 報案方式</h3>
          <p>用家裡電話（市話）撥 119，約 5 秒後一直按：1＝要消防車，9＝要救護車。</p>
          <p>傳真到 {FAX_119.number}，寫上地址、狀況和姓名。</p>
          <SourceList sources={[KEYPAD_119_SOURCE]} />
        </div>
      </section>

      <section aria-labelledby="sms110-heading" className="flex flex-col gap-3">
        <h2 id="sms110-heading" className="text-elder-button font-bold text-text-primary">
          110 簡訊報警
        </h2>
        <p className="text-elder-body text-text-second">
          110 簡訊號碼 {formatMobile(SMS_110.number)}。110 沒有官方範本，下面是照 119 範本的格式整理的。
        </p>
        <p className="whitespace-pre-wrap break-words rounded-2xl border-4 border-grayscale-800 bg-bg-dark p-4 text-elder-body font-bold text-text-primary">
          {message110}
        </p>
        <p className="text-elder-body font-bold text-text-primary">Demo 時不要真的送出。</p>
        <button type="button" onClick={() => openSms(SMS_110.number, message110)} className={SECONDARY_BUTTON}>
          打開簡訊，傳給 {formatMobile(SMS_110.number)}
        </button>
        <FailNote message={note.at(SMS_110.number)} />
        <SourceList sources={SMS_110.sources} />
      </section>

      {antifraud && <ServiceCard service={antifraud} />}

      <FullScreenCard card={card} onClose={() => setCard(null)} />
    </PageShell>
  );
}
