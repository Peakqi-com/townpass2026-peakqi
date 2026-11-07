"use client";

import { phoneCall } from "@/lib/townpass/bridge";
import type { PhoneEntry } from "@/lib/elder/home";
import { useElder } from "./ElderProvider";
import { PageShell } from "./PageShell";
import { ServiceAction, ServiceLink } from "./ServiceButton";

/** 撥號前的確認頁：大字顯示要打給誰，避免誤撥。聽不清楚模式把「用文字」放在最前面 */
export function CallConfirm({ entry }: { entry: PhoneEntry }) {
  const { mode } = useElder();
  const hearing = mode === "hearing";

  const call = (
    <ServiceAction
      onPress={() => void phoneCall(entry.number)}
      label={`撥打 ${entry.number}`}
      speak={`撥打 ${entry.title}`}
      icon="phone"
      row
      className="bg-grayscale-800 text-white"
    />
  );
  const text = (
    <ServiceLink
      href="/text"
      label="用文字聯絡"
      icon="text"
      row
      className="bg-elder-hearing text-on-elder-hearing"
    />
  );

  return (
    <PageShell title={`打給 ${entry.title}`}>
      <p className="text-elder-body text-text-second">{entry.description}</p>
      {hearing && !entry.hasTextAlternative && (
        <p className="rounded-2xl bg-bg-dark p-4 text-elder-body text-text-primary">
          這支電話目前只能用講的。可以請家人代打，或改用文字問 1999。
        </p>
      )}
      <div className="flex flex-col gap-4">
        {hearing ? (
          <>
            {text}
            {call}
          </>
        ) : (
          <>
            {call}
            {text}
          </>
        )}
      </div>
      <p className="text-h3 text-text-second">
        資料來源：
        <a href={entry.source} className="underline underline-offset-2">
          臺北市政府
        </a>
        （{entry.verified} 查證）
      </p>
    </PageShell>
  );
}
