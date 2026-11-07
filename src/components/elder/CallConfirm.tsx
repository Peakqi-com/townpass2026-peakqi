"use client";

import { phoneCall } from "@/lib/townpass/bridge";
import { formatPhone, type Service } from "@/lib/elder/services";
import { useElder } from "./ElderProvider";
import { FailNote, useFailNote } from "./FailNote";
import { PageShell } from "./PageShell";
import { ServiceAction } from "./ServiceButton";
import { useRunAction } from "./useRunAction";

/**
 * 撥號前的確認頁：大字顯示要打給誰，避免誤撥。
 * 聽不清楚模式把服務清單的 alt_channels（文字管道）排在最前面；沒有文字管道就明白說出來。
 */
export function CallConfirm({ service, number }: { service: Service; number: string }) {
  const { mode } = useElder();
  const note = useFailNote();
  const run = useRunAction();
  const hearing = mode === "hearing";
  const alts = service.alt_channels ?? [];

  const call = (
    <ServiceAction
      key="call"
      onPress={async () => {
        note.clear();
        if (!(await phoneCall(number))) note.fail("這支手機不能撥電話。請改用其他方式，或請家人幫忙。");
      }}
      label={`撥打 ${formatPhone(number)}`}
      speak={`撥打 ${service.title}`}
      icon="phone"
      row
      className="bg-grayscale-800 text-white"
    />
  );
  const texts = alts.map((alt) => (
    <ServiceAction
      key={alt.label}
      onPress={async () => {
        note.clear();
        if (!(await run(service, alt))) note.fail("打不開。請試試其他方式，或請家人幫忙。");
      }}
      label={alt.label}
      icon="text"
      row
      className="bg-elder-hearing text-on-elder-hearing"
    />
  ));

  return (
    <PageShell title={`打給 ${service.title}`}>
      <p className="text-elder-body text-text-second">{service.description}</p>
      {hearing && alts.length === 0 && (
        <p className="rounded-2xl bg-bg-dark p-4 text-elder-body text-text-primary">
          這支電話目前只能用講的。可以請家人代打，或改用文字問 1999。
        </p>
      )}
      <div className="flex flex-col gap-4">{hearing ? [...texts, call] : [call, ...texts]}</div>
      <FailNote message={note.at()} />
      <p className="text-h3 text-text-second">
        {service.owner}・
        <a href={service.source} className="underline underline-offset-2">
          官方說明
        </a>
        （{service.verified} 查證）
      </p>
    </PageShell>
  );
}
