"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { phoneCall, scanQrCode } from "@/lib/townpass/bridge";
import { openExternal } from "@/lib/townpass/elder";
import { decodeFamilyConfig, familyButtons, formatMobile, type FamilyContact } from "@/lib/elder/familyConfig";
import { useElder } from "./ElderProvider";
import { FailNote, useFailNote } from "./FailNote";
import { PageShell } from "./PageShell";
import { ServiceAction, ServiceLink } from "./ServiceButton";
import { useFamilyConfig } from "./useFamilyConfig";

const LINK =
  "flex min-h-12 items-center self-center py-3 text-elder-body text-text-second underline underline-offset-4 " +
  "outline-offset-2 focus-visible:outline focus-visible:outline-[6px] focus-visible:outline-grayscale-900";

/**
 * M7 家人（長輩這一端）：打給家人、家人幫我設定（掃 QR）。
 * 號碼來自家人的設定碼（不在 services.json），所以撥號確認是家人專用的畫面，但做法和 CallConfirm 一樣：
 * 大字顯示要打給誰 → 按「撥打」才撥；聽不清楚模式把「傳簡訊」排在最前面。
 */
export function FamilyScreen() {
  const { mode, say } = useElder();
  const note = useFailNote();
  const { config, save } = useFamilyConfig();
  const [calling, setCalling] = useState<number | null>(null);
  const [justSaved, setJustSaved] = useState(false);
  const scanning = useRef(false);
  const hearing = mode === "hearing";
  const contacts = config?.contacts ?? [];
  const contact = calling === null ? undefined : contacts[calling];

  const scan = async () => {
    // 同一個 Handler 的請求不能同時送出（bridge.ts），連按時只算一次
    if (scanning.current) return;
    scanning.current = true;
    note.clear();
    let text: string | null = null;
    try {
      text = await scanQrCode();
    } catch {
      text = null;
    } finally {
      scanning.current = false;
    }
    if (!text) {
      note.fail("沒有掃到。可以再按一次「家人幫我設定」。");
      return;
    }
    const next = decodeFamilyConfig(text);
    if (!next) {
      note.fail("這不是長輩模式的設定碼。請家人重新做一張設定碼。");
      return;
    }
    save(next);
    setJustSaved(true);
    say("設定好了，有事按這些按鈕");
  };

  // key 讓兩個畫面各自掛載，換畫面時焦點會移到新的 h1
  if (contact) return <FamilyCallConfirm key={`call-${calling}`} contact={contact} onCancel={() => setCalling(null)} />;

  return (
    <PageShell key="family" title="家人">
      {justSaved && config && (
        <section aria-labelledby="saved-heading" className="flex flex-col gap-3 rounded-2xl border-4 border-elder-family bg-white p-4">
          <h2 id="saved-heading" className="text-elder-button font-bold text-text-primary">
            設定好了
          </h2>
          <p className="text-elder-body text-text-second">
            首頁的按鈕換成：{familyButtons(config).map((b) => b.label).join("、")}。
          </p>
          <ServiceLink href="/" label="回首頁看看" icon="home" row className="bg-elder-family text-on-elder-family" />
        </section>
      )}

      {contacts.length > 0 ? (
        <section aria-labelledby="call-heading" className="flex flex-col gap-4">
          <h2 id="call-heading" className="text-elder-button font-bold text-text-primary">
            打給家人
          </h2>
          {hearing && (
            <p className="rounded-2xl bg-bg-dark p-4 text-elder-body text-text-primary">
              聽不清楚的話，可以改傳 LINE 或簡訊給家人。
            </p>
          )}
          <ul className="flex flex-col gap-4">
            {contacts.map((c, i) => (
              <li key={`${c.phone}-${i}`} className="flex flex-col gap-3">
                {hearing && <SmsButton contact={c} />}
                <ServiceAction
                  onPress={() => setCalling(i)}
                  label={`打給${c.name}`}
                  icon="phone"
                  row
                  className={hearing ? "border-4 border-grayscale-800 bg-white text-text-primary" : "bg-elder-family text-on-elder-family"}
                />
              </li>
            ))}
          </ul>
        </section>
      ) : (
        <section aria-labelledby="empty-heading" className="flex flex-col gap-3">
          <h2 id="empty-heading" className="text-elder-button font-bold text-text-primary">
            還沒有家人的電話
          </h2>
          <p className="text-elder-body text-text-second">請家人幫忙設定，只要掃一下就好：</p>
          <ol className="flex list-decimal flex-col gap-2 pl-8 text-elder-body text-text-primary">
            <li>家人在他的手機打開台北通的「長輩模式」，按「打給家人」。</li>
            <li>家人按最下面的「我是家人，幫長輩設定」，做出一張設定碼。</li>
            <li>您按下面的「家人幫我設定」，對準家人手機上的設定碼。</li>
          </ol>
        </section>
      )}

      <section aria-labelledby="setup-heading" className="flex flex-col gap-3">
        <h2 id="setup-heading" className="text-elder-button font-bold text-text-primary">
          {config ? "要換家人的電話或按鈕" : "掃家人的設定碼"}
        </h2>
        <ServiceAction
          onPress={() => void scan()}
          label="家人幫我設定"
          icon="family"
          row
          className="border-4 border-grayscale-800 bg-white text-text-primary"
        />
        <FailNote message={note.at()} />
        <p className="text-elder-body text-text-second">設定只存在這支手機，不會上傳。</p>
      </section>

      <Link href="/family/setup" className={LINK}>
        我是家人，幫長輩設定
      </Link>
    </PageShell>
  );
}

/** 聽不清楚模式：打開簡訊，對象填好家人的號碼 */
function SmsButton({ contact }: { contact: FamilyContact }) {
  const note = useFailNote();
  return (
    <>
      <ServiceAction
        onPress={async () => {
          note.clear();
          if (!(await openExternal(`sms:${contact.phone}`))) note.fail("打不開簡訊。可以請旁邊的人幫忙。");
        }}
        label={`傳簡訊給${contact.name}`}
        icon="text"
        row
        className="bg-elder-hearing text-on-elder-hearing"
      />
      <FailNote message={note.at()} />
    </>
  );
}

/**
 * 撥號前的大字確認：要打給誰、號碼是多少，按「撥打」才撥；也可以不打了。
 * M11 防詐先問一下也用這個畫面打給家人（撥號規則只寫在這裡一份）。
 */
export function FamilyCallConfirm({ contact, onCancel }: { contact: FamilyContact; onCancel: () => void }) {
  const { mode } = useElder();
  const note = useFailNote();
  const hearing = mode === "hearing";
  const number = formatMobile(contact.phone);

  const call = (
    <ServiceAction
      key="call"
      onPress={async () => {
        note.clear();
        if (!(await phoneCall(contact.phone))) note.fail("這支手機不能撥電話。請改傳簡訊，或請旁邊的人幫忙。");
      }}
      label={`撥打 ${number}`}
      speak={`撥打給${contact.name}`}
      icon="phone"
      row
      className="bg-grayscale-800 text-white"
    />
  );
  const sms = <SmsButton key="sms" contact={contact} />;

  return (
    <PageShell title={`打給${contact.name}`}>
      <p className="text-elder-title font-bold tabular-nums text-text-primary">{number}</p>
      {hearing && (
        <p className="rounded-2xl bg-bg-dark p-4 text-elder-body text-text-primary">
          聽不清楚的話，可以改傳 LINE 或簡訊給家人。
        </p>
      )}
      <div className="flex flex-col gap-4">{hearing ? [sms, call] : [call]}</div>
      <FailNote message={note.at()} />
      <ServiceAction
        onPress={onCancel}
        label="不打了，回上一步"
        row
        className="border-4 border-grayscale-800 bg-white text-text-primary"
      />
    </PageShell>
  );
}
