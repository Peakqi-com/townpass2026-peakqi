"use client";

import Link from "next/link";
import { smsUri } from "@/lib/elder/messages";
import { openExternal } from "@/lib/townpass/elder";
import { FailNote, useFailNote } from "./FailNote";
import { ServiceAction } from "./ServiceButton";
import { CopyButton } from "./hearing/parts";
import { useFamilyConfig } from "./useFamilyConfig";

/**
 * 「傳給家人知道」：把一段文字（看診時間、申請準備單、求助內容…）傳給 M7 設定好的家人。
 *
 * - 有設定家人：每位家人一顆「傳簡訊給○○」，打開簡訊 App 並帶好內文，**不會自動送出**，
 *   長輩自己按送出（或改內容）。不經過任何伺服器。
 * - 沒設定家人：只顯示「複製」，請長輩貼到 LINE；並連到 /family 說明怎麼請家人設定。
 * - 「複製」一直都在：家人習慣用 LINE 時用這個。
 *
 * ⚠️ `sms:號碼?&body=` 能不能帶入內文，Android／iOS 要實機確認（同 M8 的 119 簡訊範本）。
 */
export function ShareToFamily({
  text,
  title = "傳給家人知道",
  level = 2,
}: {
  text: string;
  title?: string;
  /** 放在 h2 段落裡用 3、放在 h3 卡片裡用 4，標題層級才不會倒過來 */
  level?: 2 | 3 | 4;
}) {
  const Heading = (["h2", "h3", "h4"] as const)[level - 2];
  const { config } = useFamilyConfig();
  const note = useFailNote();
  const contacts = config?.contacts ?? [];

  return (
    <section aria-label={title} className="flex flex-col gap-3">
      <Heading className={`${level === 2 ? "text-elder-button" : "text-elder-body"} font-bold text-text-primary`}>{title}</Heading>
      <p className="text-elder-body text-text-second">會傳出這段文字（送出前可以再改）：</p>
      <p className="whitespace-pre-line rounded-2xl bg-grayscale-50 p-4 text-elder-body text-text-primary">{text}</p>

      {contacts.map((contact) => (
        <ServiceAction
          key={contact.phone}
          onPress={async () => {
            note.clear();
            if (!(await openExternal(smsUri(contact.phone, text)))) {
              note.fail("打不開簡訊。可以按「複製」，貼到 LINE 傳給家人。");
            }
          }}
          label={`傳簡訊給${contact.name}`}
          icon="text"
          row
          className="justify-start bg-elder-family px-6 text-left text-on-elder-family"
        />
      ))}
      <FailNote message={note.at()} />

      <CopyButton text={text} label="複製這段文字" done="複製好了，可以貼到 LINE 傳給家人。" />

      {contacts.length === 0 && (
        <p className="text-elder-body text-text-second">
          還沒設定家人。可以先複製，貼到 LINE；或{" "}
          <Link href="/family" className="font-bold text-primary-700 underline underline-offset-4">
            請家人幫您設定
          </Link>
          ，之後就能直接傳簡訊。
        </p>
      )}
    </section>
  );
}
