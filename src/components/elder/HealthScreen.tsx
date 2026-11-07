"use client";

import { useState } from "react";
import {
  FOLLOW_UP_LABEL,
  followUpDateRange,
  followUpReminder,
  formatDay,
  type FollowUpKind,
} from "@/lib/elder/reminders";
import { getService, type Service } from "@/lib/elder/services";
import { followUpShareText } from "@/lib/elder/share";
import { useElder } from "./ElderProvider";
import { FailNote, useFailNote } from "./FailNote";
import { PageShell } from "./PageShell";
import { ReminderButton } from "./ReminderButton";
import { ServiceLink } from "./ServiceButton";
import { ServiceCard } from "./ServiceCard";
import { ShareToFamily } from "./ShareToFamily";
import { INPUT, LABEL, toggleClass } from "./hearing/parts";

/** 看病會用到的服務，依序：掛號（聯醫）→ 怎麼去（交通局、社會局）→ 找人照顧（衛生局） */
const HEALTH_IDS = ["tpech-reg", "page-ride", "ltc-1966"] as const;
/** 聽不清楚模式另外加：看病時申請手語翻譯或同步聽打（社會局） */
const HEARING_IDS = ["sign-language"] as const;

function pick(ids: readonly string[]): Service[] {
  return ids.map(getService).filter((s): s is Service => Boolean(s));
}

/**
 * M4 我要看醫生：一頁看到原本分散在聯醫、交通局、社會局、衛生局的看病選項。
 * 不需要開放資料；醫院清單由其他模組處理。
 */
export function HealthScreen() {
  const { mode, now, user } = useElder();
  const hearing = mode === "hearing";
  // 敬老卡扣掛號費的出處：市府 114/10/29 新聞（115/1 起擴大到一般長者，21 處聯醫門診）
  const seniorCard = getService("senior-card");

  return (
    <PageShell title="看醫生">
      <p className="text-elder-body text-text-second">掛號、叫車、找人照顧，都在這一頁。</p>

      {pick(HEALTH_IDS).map((service) => (
        <div key={service.id} className="flex flex-col gap-3">
          <ServiceCard service={service} />
          {service.id === "tpech-reg" && seniorCard && (
            <p className="rounded-2xl border-4 border-elder-benefit bg-white p-4 text-elder-body text-text-primary">
              <strong>掛號費可以用敬老卡付：</strong>在聯醫門診刷敬老卡，每次扣 50 點。
              <span className="mt-1 block text-h3 text-text-second">
                臺北市政府・
                <a href={seniorCard.source} className="underline underline-offset-2">
                  官方說明
                </a>
                （{seniorCard.verified} 查證）
              </span>
            </p>
          )}
        </div>
      ))}

      {/* 依行政區列出合約院所（data.taipei） */}
      <ServiceLink href="/health/places" label="附近打疫苗、做篩檢" speak="附近哪裡可以打疫苗、做篩檢" icon="health" row className="bg-elder-health text-on-elder-health" />
      <ServiceLink href="/care" label="照顧家人：失智、喘息" speak="照顧家人，失智症篩檢和喘息服務" icon="family" row className="bg-elder-family text-on-elder-family" />

      {hearing && (
        <section aria-labelledby="health-hearing-heading" className="flex flex-col gap-4">
          <h2 id="health-hearing-heading" className="text-elder-button font-bold text-text-primary">
            聽不清楚的話
          </h2>
          <p className="text-elder-body text-text-second">看診時把溝通卡給醫生看，或用文字聯絡。</p>
          <ServiceLink
            href="/card/clinic"
            label="看診溝通卡"
            icon="ear"
            row
            className="bg-elder-hearing text-on-elder-hearing"
          />
          <ServiceLink
            href="/text"
            label="用文字聯絡"
            icon="text"
            row
            className="bg-elder-hearing text-on-elder-hearing"
          />
          {pick(HEARING_IDS).map((service) => (
            <ServiceCard key={service.id} service={service} headingLevel={3} />
          ))}
        </section>
      )}

      {/* 日期要用 now（使用者資料讀完後才有），所以讀完才顯示 */}
      {now && <AfterVisit now={now} name={user?.realName} />}
    </PageShell>
  );
}

const FOLLOW_UP_KINDS: readonly FollowUpKind[] = ["revisit", "refill"];

/**
 * 看完醫生之後：選「回診」或「領藥」和日子，前一天晚上 7 點跳出手機通知（規則在 reminders.ts），
 * 也可以把日子傳給家人，請家人提醒。
 * 只提醒要帶的東西（健保卡、藥袋、處方箋），不寫健保的領藥期限等規則（沒有查證健保署官方頁面）。
 */
function AfterVisit({ now, name }: { now: Date; name?: string }) {
  const { announce } = useElder();
  const note = useFailNote();
  const [kind, setKind] = useState<FollowUpKind | null>(null);
  const [date, setDate] = useState("");
  const range = followUpDateRange(now);
  const reminder = kind && date ? followUpReminder({ kind, date, now }) : null;

  const pickDate = (value: string) => {
    setDate(value);
    note.clear();
    if (!value) return;
    // 有些手機可以直接打字，會選到範圍外的日子
    if (value > range.max) note.fail(`最遠只能選到 ${formatDay(range.max)}。`);
    else if (!followUpReminder({ kind: kind ?? "revisit", date: value, now })) note.fail("這一天已經過了，來不及提醒。");
  };

  return (
    <>
      <section aria-labelledby="after-visit-heading" className="flex flex-col gap-4">
        <h2 id="after-visit-heading" className="text-elder-button font-bold text-text-primary">
          看完醫生之後
        </h2>
        <p className="text-elder-body text-text-second">選下次回診或領藥的日子，前一天晚上 7 點手機會跳出通知提醒您。</p>

        <fieldset className="flex flex-col gap-3">
          <legend className={`${LABEL} mb-2`}>要提醒什麼？</legend>
          {FOLLOW_UP_KINDS.map((k) => {
            const pressed = kind === k;
            return (
              <button
                key={k}
                type="button"
                aria-pressed={pressed}
                onClick={() => {
                  announce(FOLLOW_UP_LABEL[k]);
                  setKind(k);
                }}
                className={`w-full ${toggleClass(pressed)}`}
              >
                {/* 選到時深底加「✓」，不只靠顏色；報讀軟體由 aria-pressed 唸「已選取」 */}
                {pressed && <span aria-hidden="true">✓</span>}
                {FOLLOW_UP_LABEL[k]}
              </button>
            );
          })}
        </fieldset>

        <div className="flex flex-col gap-2">
          <label htmlFor="after-visit-date" className={LABEL}>
            哪一天？
          </label>
          <input
            id="after-visit-date"
            type="date"
            min={range.min}
            max={range.max}
            value={date}
            onChange={(e) => pickDate(e.target.value)}
            className={INPUT}
          />
          <FailNote message={note.at()} />
        </div>

        {!kind && date && <p className="text-elder-body text-text-second">再選上面「要提醒什麼？」，就可以設定提醒。</p>}
        {reminder && kind && (
          <ReminderButton key={reminder.id} reminder={reminder} label={kind === "revisit" ? "提醒我回診" : "提醒我領藥"} />
        )}
      </section>

      {reminder && kind && <ShareToFamily text={followUpShareText({ kind, date, name })} />}
    </>
  );
}
