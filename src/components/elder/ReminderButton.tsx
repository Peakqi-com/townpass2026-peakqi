"use client";

import { useState } from "react";
import { formatReminderTime, readSavedReminders, saveReminder, type Reminder } from "@/lib/elder/reminders";
import { cancelReminder, setReminder } from "@/lib/townpass/elder";
import { useElder } from "./ElderProvider";
import { ServiceAction } from "./ServiceButton";

const ERROR_TEXT: Record<string, string> = {
  not_in_app: "要在台北通 App 裡才能設定提醒。",
  permission_denied: "台北通沒有通知權限。請到手機的設定，打開台北通的通知，再按一次。",
  past: "時間已經過了，不用提醒了。",
};

/**
 * 「提醒我」：用 App 的 reminder Handler 在指定時間跳出手機通知（App 關掉也會跳）。
 * 設定好的提醒記在手機裡，下次打開時顯示「已設定」與取消按鈕。
 * 這個元件只會在使用者資料讀完後才出現（client 端），可以直接讀 localStorage。
 */
export function ReminderButton({ reminder, label }: { reminder: Reminder; label: string }) {
  const { say } = useElder();
  const [savedAt, setSavedAt] = useState<string | null>(() => readSavedReminders()[reminder.id] ?? null);
  const [busy, setBusy] = useState(false);
  const when = formatReminderTime(savedAt ?? reminder.at);

  async function set() {
    if (busy) return;
    setBusy(true);
    const result = await setReminder(reminder);
    setBusy(false);
    if (result.ok) {
      saveReminder(reminder.id, reminder.at);
      setSavedAt(reminder.at);
      say(`好了，${formatReminderTime(reminder.at)}會跳出通知提醒您。`);
    } else {
      say(ERROR_TEXT[result.error] ?? "現在設定不了，請稍後再試。");
    }
  }

  async function cancel() {
    if (busy) return;
    setBusy(true);
    await cancelReminder(reminder.id);
    setBusy(false);
    saveReminder(reminder.id, null);
    setSavedAt(null);
    say("已經取消提醒。");
  }

  if (savedAt) {
    return (
      <div className="flex flex-col gap-3">
        <p className="text-elder-body font-bold text-text-primary">已設定提醒：{when}會跳出手機通知。</p>
        <ServiceAction
          onPress={cancel}
          label="取消提醒"
          icon="bell"
          row
          className="justify-start border-4 border-grayscale-800 bg-white px-6 text-left text-text-primary"
        />
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-2">
      <ServiceAction
        onPress={set}
        label={label}
        speak={`${label}，${when}會跳出手機通知`}
        icon="bell"
        row
        className="justify-start border-4 border-grayscale-800 bg-white px-6 text-left text-text-primary"
      />
      <p className="text-elder-body text-text-second">會在 {when}跳出手機通知。</p>
    </div>
  );
}
