import type { IconName } from "@/lib/elder/home";

/**
 * 長輩模式的圖示。線條粗（stroke 2.5）、造型簡單，旁邊一定搭配文字，
 * 所以一律 aria-hidden，不讓螢幕閱讀器重複唸。
 */
export function Icon({ name, className = "size-10" }: { name: IconName; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className={className}
    >
      {PATHS[name]}
    </svg>
  );
}

const PATHS: Record<IconName, React.ReactNode> = {
  // 十字（醫療）
  health: <path d="M9 3h6v6h6v6h-6v6H9v-6H3V9h6z" />,
  // 車
  ride: (
    <>
      <path d="M4 16V11l2-5h12l2 5v5z" />
      <path d="M4 11h16" />
      <circle cx="7.5" cy="16.5" r="1.8" />
      <circle cx="16.5" cy="16.5" r="1.8" />
    </>
  ),
  // 錢幣
  benefit: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7v10M9.5 9.5h4a1.5 1.5 0 0 1 0 3h-3a1.5 1.5 0 0 0 0 3h4" />
    </>
  ),
  // 碗
  community: (
    <>
      <path d="M3 11h18a9 9 0 0 1-18 0z" />
      <path d="M8 7c0-1.5 1-2 1-3M12 7c0-1.5 1-2 1-3M16 7c0-1.5 1-2 1-3" />
    </>
  ),
  // 兩個人
  family: (
    <>
      <circle cx="8.5" cy="8" r="3" />
      <circle cx="16.5" cy="9" r="2.5" />
      <path d="M2.5 20a6 6 0 0 1 12 0M14 20a4.5 4.5 0 0 1 7.5-3.5" />
    </>
  ),
  // 對話框
  text: (
    <>
      <path d="M4 5h16v11H9l-5 4z" />
      <path d="M8 9.5h8M8 12.5h5" />
    </>
  ),
  phone: <path d="M6 3h3l2 5-2.5 1.5a11 11 0 0 0 6 6L16 13l5 2v3a3 3 0 0 1-3 3A16 16 0 0 1 3 6a3 3 0 0 1 3-3z" />,
  // 驚嘆號（求助）
  help: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v6M12 16.5v.5" />
    </>
  ),
  search: (
    <>
      <circle cx="10.5" cy="10.5" r="6.5" />
      <path d="M15.5 15.5 21 21" />
    </>
  ),
  home: (
    <>
      <path d="M3 11 12 4l9 7" />
      <path d="M5.5 9.5V20h13V9.5" />
    </>
  ),
  eye: (
    <>
      <path d="M2 12s3.5-6.5 10-6.5S22 12 22 12s-3.5 6.5-10 6.5S2 12 2 12z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  ear: (
    <>
      <path d="M7 9a5 5 0 0 1 10 0c0 3-3 4-3 7a3 3 0 0 1-6 0" />
      <path d="M10 9.5a2 2 0 0 1 4 0" />
    </>
  ),
  smile: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M8 14a5 5 0 0 0 8 0M9 9.5v.5M15 9.5v.5" />
    </>
  ),
  // 換模式：上下兩個方向相反的箭頭
  switch: <path d="M4 8h14l-4-4M20 16H6l4 4" />,
};
