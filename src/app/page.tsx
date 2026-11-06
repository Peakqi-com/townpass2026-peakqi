import { BridgeDemo } from "@/components/BridgeDemo";

// 城市通 App 的 AppBar 已經顯示服務名稱（<title>），頁面內不要再做重複的標題列（無障礙 ST）。
export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 p-4">
      <p className="text-body text-text-second">
        這是專案骨架的示範頁。確認雙向溝通與後端 API 都正常之後，換成正式的服務畫面。
      </p>
      <BridgeDemo />
    </main>
  );
}
