import type { Metadata, Viewport } from "next";
import { ElderProvider } from "@/components/elder/ElderProvider";
import { OfflineSupport } from "@/components/elder/OfflineSupport";
import "./globals.css";

// 在城市通 App 內，AppBar 會顯示這個 title（除非 App 端設定了 forceWebViewTitle）。
export const metadata: Metadata = {
  title: "用得了",
  description: "說一句話，城市就聽懂。長輩、視障者、聽障者用同一個入口，依需求找到市府服務。",
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
      <body className="flex min-h-full flex-col bg-white">
        <ElderProvider>
          <OfflineSupport />
          {children}
        </ElderProvider>
      </body>
    </html>
  );
}
