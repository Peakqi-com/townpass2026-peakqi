/**
 * 長輩模式首頁的按鈕與電話設定。
 *
 * 顏色跟著服務類別固定（elder-mode-spec.md §4.1），家人換了按鈕，「叫車」永遠是黃色。
 * className 必須寫完整的字串，Tailwind 才會產生對應的 CSS。
 */

export type IconName =
  | "health"
  | "ride"
  | "benefit"
  | "community"
  | "family"
  | "text"
  | "phone"
  | "help"
  | "search"
  | "home"
  | "eye"
  | "ear"
  | "smile";

export interface HomeButton {
  id: string;
  /** 按鈕上的字，兩到四個字 */
  label: string;
  /** 按下時唸出來的話 */
  speak: string;
  href: `/${string}`;
  icon: IconName;
  className: string;
}

/** 預設的 6 個大按鈕。之後由家人代設定（M7）挑選 */
export const HOME_BUTTONS: readonly HomeButton[] = [
  { id: "health", label: "看醫生", speak: "看醫生", href: "/health", icon: "health", className: "bg-elder-health text-on-elder-health" },
  { id: "ride", label: "叫車", speak: "叫車", href: "/ride", icon: "ride", className: "bg-elder-ride text-on-elder-ride" },
  { id: "benefits", label: "我的權益", speak: "我的權益", href: "/benefits", icon: "benefit", className: "bg-elder-benefit text-on-elder-benefit" },
  { id: "community", label: "吃飯上課", speak: "附近吃飯、上課的地方", href: "/community", icon: "community", className: "bg-elder-community text-on-elder-community" },
  { id: "family", label: "打給家人", speak: "打給家人", href: "/family", icon: "family", className: "bg-elder-family text-on-elder-family" },
  { id: "text", label: "文字聯絡", speak: "用文字聯絡市政府", href: "/text", icon: "text", className: "bg-elder-hearing text-on-elder-hearing" },
];

export interface PhoneEntry {
  /** 確認頁的大字標題：「打給 ○○」 */
  title: string;
  /** 一句話說明這支電話做什麼 */
  description: string;
  number: string;
  /** 有文字或視訊替代管道時，連到「用文字聯絡」頁 */
  hasTextAlternative: boolean;
  source: string;
  verified: string;
}

/**
 * 需要確認頁的電話。號碼寫死在這裡，不從網址參數讀取，避免被帶去撥任意號碼。
 * 1999 走 App 內建的 1999agree（自帶確認），不在這裡。
 */
export const PHONES: Readonly<Record<string, PhoneEntry>> = {
  "1966": {
    title: "1966 長照專線",
    description: "申請長期照顧服務：居家照顧、交通接送、輔具、喘息服務。",
    number: "1966",
    hasTextAlternative: false,
    source: "https://dosw.gov.taipei/cp.aspx?n=1847C5A001C1DC3C",
    verified: "2026-11-07",
  },
};
