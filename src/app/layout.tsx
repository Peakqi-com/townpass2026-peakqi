import type { Metadata, Viewport } from "next";
import "./globals.css";

// 在城市通 App 內，AppBar 會顯示這個 title（除非 App 端設定了 forceWebViewTitle），
// 所以請寫成正式的服務名稱。
export const metadata: Metadata = {
  title: "TODO：服務名稱",
  description: "TODO：一句話介紹這個服務",
};

// 不設定 maximumScale / userScalable，保留使用者縮放的能力（無障礙 DT）
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#5ab4c5",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="zh-Hant-TW" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
