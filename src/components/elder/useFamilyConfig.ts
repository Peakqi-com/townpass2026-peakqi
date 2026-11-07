"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";
import { createSettingStore } from "@/lib/elder/settingStore";
import { decodeFamilyConfig, encodeFamilyConfig, type FamilyConfig } from "@/lib/elder/familyConfig";

/**
 * 家人代設定（M7）存在長輩手機的 localStorage（key：elder-family）。
 * 存的是設定碼字串本身；讀取時再驗證一次，被改壞的內容當作沒有設定。
 * store 回傳字串（而不是物件），useSyncExternalStore 才不會因為每次都是新物件而一直重畫。
 */
const familyStore = createSettingStore<string>("elder-family", (value) =>
  value !== null && decodeFamilyConfig(value) ? value : null,
);

export function useFamilyConfig(): { config: FamilyConfig | null; save: (config: FamilyConfig) => void } {
  const text = useSyncExternalStore(familyStore.subscribe, familyStore.read, familyStore.readServer);
  const config = useMemo(() => (text ? decodeFamilyConfig(text) : null), [text]);
  const save = useCallback((next: FamilyConfig) => familyStore.write(encodeFamilyConfig(next)), []);
  return { config, save };
}
