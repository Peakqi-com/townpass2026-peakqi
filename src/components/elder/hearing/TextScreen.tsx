"use client";

import { TEXT_CHANNELS, type TextChannel } from "@/lib/elder/hearing";
import { smsUri } from "@/lib/elder/messages";
import { getService } from "@/lib/elder/services";
import { openExternal } from "@/lib/townpass/elder";
import { useElder } from "../ElderProvider";
import { FailNote, useFailNote } from "../FailNote";
import { PageShell } from "../PageShell";
import { ServiceAction, ServiceLink } from "../ServiceButton";
import { useRunAction } from "../useRunAction";
import { CopyButton, SECONDARY_BUTTON, SourceList } from "./parts";

/**
 * /text 文字聯絡（M8）：聽障者不用講電話就能聯絡市府的所有管道，一頁看完。
 * 每個管道寫上服務時間、主責機關、官方來源與查證日期（原則 8）。
 */
export function TextScreen() {
  return (
    <PageShell title="用文字聯絡">
      <p className="text-elder-body text-text-second">下面這些方式都不用講話。每一項都寫了服務時間和官方出處。</p>

      {TEXT_CHANNELS.map((channel) => (
        <ChannelCard key={channel.id} channel={channel} />
      ))}

      <section aria-labelledby="more-heading" className="flex flex-col gap-3">
        <h2 id="more-heading" className="text-elder-button font-bold text-text-primary">
          其他
        </h2>
        <ServiceLink
          href="/help"
          label="緊急求助（119、110 簡訊）"
          speak="緊急求助"
          icon="help"
          row
          className="bg-elder-help text-on-elder-help"
        />
        <ServiceLink
          href="/card/clinic"
          label="看診溝通卡、預約手語翻譯"
          speak="看診溝通卡"
          icon="health"
          row
          className="bg-elder-hearing text-on-elder-hearing"
        />
      </section>
    </PageShell>
  );
}

function ChannelCard({ channel }: { channel: TextChannel }) {
  const { announce } = useElder();
  const note = useFailNote();
  const run = useRunAction();
  const service = channel.serviceId ? getService(channel.serviceId) : undefined;
  const action = service && (channel.serviceAction === "alt" ? service.alt_channels?.[0] : service.action);
  const headingId = `channel-${channel.id}`;

  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-3 rounded-2xl border-4 border-divider bg-white p-4">
      <h2 id={headingId} className="text-elder-button font-bold text-text-primary">
        {channel.title}
      </h2>
      <p className="text-elder-body text-text-primary">{channel.summary}</p>

      <dl className="flex flex-col gap-1 rounded-xl bg-bg-dark p-3 text-elder-body text-text-primary">
        {channel.hours.map((h) => (
          <div key={h.label} className="flex flex-wrap gap-x-2">
            <dt className="font-bold">{h.label}：</dt>
            <dd>{h.value}</dd>
          </div>
        ))}
      </dl>

      {channel.contacts.map((c) => (
        <div key={`${c.kind}-${c.value}`} className="flex flex-col gap-2">
          <p className="text-elder-body text-text-second">
            {c.label}
            <span className="block select-all break-all text-elder-button font-bold text-text-primary">{c.value}</span>
          </p>
          {c.copy && <CopyButton text={c.copy} label={`複製${c.label}`} />}
          {c.sms && (
            <button
              type="button"
              onClick={async () => {
                announce(`傳簡訊給 ${c.value}`);
                note.clear();
                if (!(await openExternal(smsUri(c.sms!, "")))) note.fail("打不開簡訊。請改用 LINE，或請家人幫忙。", `${c.kind}-${c.value}`);
              }}
              className={SECONDARY_BUTTON}
            >
              傳簡訊給 {c.value}
            </button>
          )}
          <FailNote message={note.at(`${c.kind}-${c.value}`)} />
        </div>
      ))}

      {service && action && (
        <ServiceAction
          onPress={async () => {
            note.clear();
            if (!(await run(service, action))) note.fail("打不開。請試試其他方式，或請家人幫忙。", "action");
          }}
          label={action.label ?? service.title}
          icon="text"
          row
          className="bg-elder-hearing text-on-elder-hearing"
        />
      )}
      <FailNote message={note.at("action")} />

      {channel.notes.map((n) => (
        <p key={n} className="text-elder-body text-text-second">
          {n}
        </p>
      ))}

      <SourceList sources={channel.sources} owner={channel.owner} />
    </section>
  );
}
