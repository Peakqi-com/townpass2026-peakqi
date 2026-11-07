import { BridgeDemo } from "@/components/BridgeDemo";
import { ElderBridgeDemo } from "@/components/ElderBridgeDemo";

// 開發用測試頁：確認雙向溝通、後端 API、長輩模式 Handler 都正常。正式畫面在首頁。
export default function DevPage() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 p-4">
      <p className="text-body text-text-second">開發用測試頁。長輩模式的正式畫面在首頁。</p>
      <BridgeDemo />
      <ElderBridgeDemo />
    </main>
  );
}
