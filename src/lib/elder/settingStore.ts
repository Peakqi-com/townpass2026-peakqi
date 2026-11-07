/**
 * 存在 localStorage 的使用者設定（模式、語速），給 useSyncExternalStore 讀取。
 *
 * localStorage 在私密模式或被封鎖時會丟例外：讀寫都用 try/catch，存不了時保留在記憶體裡，
 * 至少這次使用期間有效。只能在瀏覽器端呼叫 read／write／subscribe。
 */
export interface SettingStore<T extends string> {
  read: () => T | null;
  write: (value: T) => void;
  subscribe: (listener: () => void) => () => void;
  /** 伺服器端沒有 localStorage，一律當作還沒設定 */
  readServer: () => null;
}

export function createSettingStore<T extends string>(key: string, parse: (value: string | null) => T | null): SettingStore<T> {
  let memory: T | null = null;
  const listeners = new Set<() => void>();

  return {
    read() {
      try {
        return parse(window.localStorage.getItem(key)) ?? memory;
      } catch {
        return memory;
      }
    },
    write(value) {
      memory = value;
      try {
        window.localStorage.setItem(key, value);
      } catch {
        // 存不了就只在這次使用期間有效
      }
      listeners.forEach((listener) => listener());
    },
    subscribe(listener) {
      listeners.add(listener);
      window.addEventListener("storage", listener);
      return () => {
        listeners.delete(listener);
        window.removeEventListener("storage", listener);
      };
    },
    readServer: () => null,
  };
}
