@AGENTS.md

# CLAUDE.md — 用得了（townpass2026-peakqi）

「2026 臺北秋季程式設計節 · 城市通微服務大黑客松」的參賽作品。服務名稱「用得了」，開發代號「長輩模式」（程式碼、Handler、色票、檔名沿用）。
規則來源：`2026 城市通入門指引 2.html`（賽前工作坊投影片，2026/10/25）與競賽須知（115.08.27 版）。

回應一律使用繁體中文（台灣用語）。

## Repo 結構（一個 repo 放全部）

| 位置 | 內容 | 授權 |
|---|---|---|
| 根目錄（`src/`、`package.json`…） | 微服務網頁：Next.js 16，前端＋後端 Route Handlers。Vercel 從根目錄部署 | AGPL-3.0（`LICENSE`） |
| `townpass/` | 修改過的城市通 App：fork 自 [taipei-doit/TownPass](https://github.com/taipei-doit/TownPass) main（2026/10，Flutter 3.47.6），保留完整 git 歷史 | GPL-3.0（`townpass/LICENSE`） |
| `docs/` | 規格、研究、開放資料、設計系統、架構圖與流程圖（唯一一份文件） | — |

- **路徑慣例**：文件裡 App 端的路徑（`lib/`、`assets/`、`ios/`、`android/`、`test/`、`pubspec.yaml`）都相對於 `townpass/`；網頁端的路徑一律以 `src/` 開頭。
- **不要在根目錄建 `app/` 資料夾**：Next.js 遇到根目錄的 `app/` 會忽略 `src/app`，整個網站會壞掉。
- `tsconfig.json`、ESLint、`.dockerignore` 都已排除 `townpass/`；新增工具設定時也要排除。
- 2026-11-07 以前 App 在另一個 repo（Peakqi-com/TownPass），已併進 `townpass/`，舊 repo 不再更新。

---

## 0. 最高原則：技術棧不得超出指引範圍

**本專案只能使用下面「允許清單」裡的技術。** 清單外的語言、框架、套件、雲端服務、AI 模型，一律**先停下來問使用者**，不得自行引入；即使只是「順手裝一個小工具」也一樣。

新增任何依賴前必須確認：
1. 在允許清單內，或已經得到使用者同意
2. 開源且免費，授權為 **MIT／BSD／Apache-2.0**（可納入 AGPL 專案）。標示「僅供個人使用」「不得再散布」的套件禁用
3. 把「套件名稱＋授權」記到 README 的「第三方套件」

### 0.1 允許清單

| 層 | 允許 | 備註 |
|---|---|---|
| App | Flutter **3.47.6**（FVM，見 `townpass/.fvmrc`）、Dart ≥ 3.13 | iOS 最低 15（UIScene、SPM）；Android AGP 9.1.0、Kotlin 2.4.0、Gradle 9.3.1、Java 17 |
| App 狀態／路由 | 沿用現有的 GetX、`TPRoute` | 不要另外引入 Riverpod、Bloc、go_router 等 |
| App 新套件 | pub.dev 上 MIT／BSD／Apache 的套件 | iOS 優先選支援 Swift Package Manager 的（CocoaPods 已進入維護模式） |
| App 新套件（已核准） | **flutter_tts**（MIT，`speak` Handler）、**speech_to_text**（BSD-3-Clause，`listen` Handler）、**timezone**（BSD-2-Clause，`reminder` Handler 排程通知；原本就是 flutter_local_notifications 的間接依賴） | 2026-11-07 隊長核准。speech_to_text 一定要用 `onDevice: true`，並先檢查裝置是否支援離線辨識，不支援就回錯誤，**不可退回雲端辨識** |
| 微服務新套件（已核准） | **qrcode**（MIT，家人代設定產生 QR code） | 2026-11-07 隊長核准 |
| 微服務前端 | **Next.js（App Router）+ React + TypeScript + Tailwind CSS v4**（本作品採用）；官方範例是 Vue 3 + Vite + Pinia + Tailwind；純 HTML／CSS／JS 也可以 | 必須能在 WebView 中執行。指引原文：「語言、框架不限」 |
| 後端（選配） | **Next.js Route Handlers**（本作品採用，和前端同一個專案）；Java：Spring Boot 4.x + Java 21 + Maven；Python：FastAPI、Flask | 指引原文：「語言不限」。一定要附 `Dockerfile`（「可移轉、可維運、可上架」）；埠號讀環境變數 `PORT`；前後端不同網域時要設定 CORS |
| 資料庫 | **指引未指定**（只有 #49 寫「一般後端：登入、資料庫…」屬於允許事項；#11 提到 Hibernate） | 選型前**先問使用者**。條件：免費、開源、可移轉。能直接即時抓開放資料的話，就不需要資料庫（本作品目前不用資料庫） |
| 地圖 | **Leaflet** 或 **MapLibre**，搭配 **OpenStreetMap** 或**國土測繪中心**圖資 | **禁用** Google Maps、`google_maps_flutter`、Mapbox |
| 圖表 | 開源、免費的套件（指引沒指定，選用前先問） | |
| 裝置端 AI | **flutter_edge_ai**（原 flutter_gemma，MIT）、**llamadart**（MIT）；模型 Gemma 4 E2B／E4B、Gemma 3n、Phi-4 Mini | 見 §0.2 |
| 傳統 ML | 往屆用過 XGBoost（開源） | 推論同樣不能呼叫雲端 |
| 前端部署 | **Vercel**（本作品採用）、Firebase Hosting、GitHub Pages、Cloudflare Pages | 一定要 HTTPS；只能用免費方案。指引原文：「部署平台不限，請使用免費方案」 |
| 後端部署 | **Vercel（限 Next.js 一體式架構）**、Cloud Run（區域 `asia-east1`，`gcloud run deploy --source .`）、Render、Fly.io；比賽期間可用 ngrok | 映像檔推到 Artifact Registry（`pkg.dev`）。`gcr.io`（Container Registry）已在 2025/3 停止服務，不要再用。用 Vercel 的條件見 `docs/deployment.md` §3 |
| 開發工具 | VS Code（或 AI 編輯器）、Android Studio、Xcode、FVM、Git、Docker、Postman、Chrome DevTools | |
| 開放資料 | **data.taipei**（優先）、data.gov.tw、TDX（tdx.transportdata.tw，要申請金鑰）、臺北城市儀表板 | |

### 0.2 AI 規範（競賽須知 AI 使用規範）

- **開發階段**：可以用雲端 AI（Claude Code 等）來企劃、寫程式、除錯、整理資料。
- **執行階段**：作品執行時，所有 LLM／模型推論都**必須在裝置端完成**。不可呼叫任何雲端推論 API 或遠端模型（OpenAI、Anthropic、Gemini API、Vercel AI SDK 接雲端模型等都不行），處理使用者輸入的推論也一樣。
- 評審可能**關閉網路**現場出題來驗證，所以 AI 功能必須能離線運作。Demo 前要用飛航模式完整測一次。
- **禁用**「危害國家資通安全清單」上的 AI 工具與模型（含大陸廠牌，例如 DeepSeek、Qwen 系列）。
- 建議架構：網頁 `postMessage({name:'llm_ask'})` → App 的自訂 Handler → 裝置端推論 → 回傳結果。開放資料可以放進 prompt（RAG）。
- README 必須揭露：**模型名稱、版本、量化格式、推論框架、來源**。
- 允許事項：一般後端（登入、資料庫、檔案、排行榜、同步），以及**預先生成**的固定文字、圖片、程式碼（要如實說明）。

### 0.3 資料規範

- 核心資料必須是**合法的開放資料**，並註明出處；非核心資料可以用模擬資料，但要標示清楚。
- README 和 Demo 要寫出資料集名稱與連結（README「資料來源」）。
- **AI 產生的 API 網址、資料集名稱、欄位都要實際打開來源確認**，禁止憑印象編造。

### 0.4 授權與繳交

- 參賽作品放在**公開 repo**，授權 **AGPL-3.0**，並附上主辦指定的授權聲明；得獎公布後要保持公開至少一年。`townpass/` 沿用 TownPass 本體的 GPL-3.0（GPLv3 §13 允許和 AGPL-3.0 放在一起）。
- 繳交項目：所有原始碼（微服務、後端、修改過的 TownPass）、LICENSE、README（照著做就能建置）、資料來源清單、第三方套件清單（名稱＋授權）、AI 模型揭露。
- 不要 commit 金鑰（TDX key、Firebase 設定等），改用環境變數或 `.env.local`，並列入 `.gitignore`。網頁的金鑰只放在 server 端環境變數，不加 `NEXT_PUBLIC_` 前綴。
- **不使用 Vercel 專屬服務**（KV、Blob、Postgres、Edge Config），必須維持可用 `Dockerfile` 移轉到其他平台。

---

## 1. 常用指令

**網頁（根目錄）**

```bash
npm run dev     # http://localhost:3000（一般瀏覽器會自動使用 mock 資料）
npm run build   # 會產生 .next/standalone
npm run lint
npm test        # 單元測試（node --test，src/**/*.test.ts）
npx tsc --noEmit
docker build -t townpass2026-peakqi . && docker run -p 8080:8080 townpass2026-peakqi
```

**App（`townpass/`）**

```bash
cd townpass
fvm install                                              # 依 .fvmrc 安裝 Flutter 3.47.6
fvm flutter pub get
fvm dart run build_runner build --delete-conflicting-outputs   # 產生 lib/gen/assets.gen.dart 與 JSON 序列化
fvm flutter run
fvm flutter analyze
fvm flutter test
fvm flutter clean                                         # Android build 出問題時先試這個
```

- `*.gen.dart` 已列入 `townpass/.gitignore`。新增 SVG／mock 檔或修改 `@JsonSerializable` model 之後，都要重跑 build_runner。
- 沒有 FVM 的話，把指令開頭的 `fvm` 拿掉，並確認 `flutter --version` 是 3.47.6。

**文件的圖**：架構圖、流程圖改 `docs/diagrams/build_diagrams.py` 後重跑 `python3 docs/diagrams/build_diagrams.py`；不要手改 SVG。

## 2. 專案結構與常改的位置

**網頁（`src/`）**

```
src/
├─ app/                   各頁面（layout.tsx 的 metadata.title = App AppBar 顯示的服務名稱）
│  ├─ globals.css         城市通設計 token＋長輩模式色票（Tailwind v4 @theme）
│  └─ api/
│     ├─ health/              健康檢查
│     ├─ opendata/[source]/   開放資料代理
│     └─ bus/                 公車路線、站牌、預估到站（M16）
├─ components/elder/      共用元件與各模組畫面
├─ data/                  services.json（服務清單）、subsidies.json、antifraud.json
└─ lib/
   ├─ townpass/           bridge.ts（內建 Handler）、elder.ts（新增 Handler）、types.ts、mock.ts
   ├─ elder/              各模組的純邏輯（有單元測試）
   ├─ bus/                公車資料解析
   └─ opendata/           sources.ts（白名單）、client.ts、parse.ts、geo.ts、query.ts、cache.ts
```

**App（`townpass/lib/`）**

```
townpass/lib/
├─ bean/        資料模型（json_serializable）
├─ page/        各頁面；city_service/ 是「服務」頁，city_service_edit/ 是編輯置頂
├─ service/     帳號（讀 mock）、定位、通知、裝置資訊、SharedPreferences
├─ util/        TP 元件（tp_colors、tp_text_styles、tp_button…）、tp_web_view、web_message_handler/
└─ gen/         build_runner 產生（不進版控）
townpass/assets/mock_data/  account.json 等 5 個假資料
townpass/assets/svg/        圖示（snake_case）
```

| 要做的事 | 位置 |
|---|---|
| 新增服務／改「用得了」卡片 | `townpass/lib/page/city_service/model/my_service_model.dart` |
| 熱門區塊 | `townpass/lib/page/city_service/model/trending_service_model.dart` |
| 服務拼貼四張卡 | `townpass/lib/page/city_service/widget/official_service_card/` |
| 預設置頂 | `townpass/lib/page/city_service/widget/pinned_service_widget_controller.dart` |
| 擴充 App 能力（Handler） | `townpass/lib/util/web_message_handler/`（本服務的在 `elder_mode_message_handlers.dart`） |
| 信任網域（`listen`、`reminder` 只開放這些網域） | `townpass/lib/util/elder_mode_config.dart` |
| 切換測試帳號 | `townpass/assets/mock_data/account.json`（改完要**重啟** App） |
| 服務清單、補助、防詐資料 | `src/data/*.json` |
| 新增開放資料來源 | `src/lib/opendata/sources.ts` |

## 3. 詳細文件（動手前先讀）

- 新增服務、雙向溝通、自訂 Handler、WebView 注意事項：[`docs/adding-a-service.md`](docs/adding-a-service.md)
- UI 設計系統（Figma UI Kit、色票、字級、無障礙、Figma MCP 讀取流程）：[`docs/design-system.md`](docs/design-system.md)
- 後端與部署（Firebase／Cloud Run／Next.js + Vercel、串回城市通）：[`docs/deployment.md`](docs/deployment.md)
- 開放資料（data.taipei 已驗證的資料集、編碼／座標／CORS 問題、題目方向）：[`docs/open-data.md`](docs/open-data.md)。找新資料集時先搜尋 `docs/open-data/data-taipei-catalog.csv`（全部 2,816 筆）
- 往屆得獎作品（2024、2025 共 12 件）：[`docs/past-winners.md`](docs/past-winners.md)
- **「用得了」功能規格（開發時以這份為準）**：模組、服務清單 JSON 規格、介面規範、架構與串接流程、開發順序：[`docs/elder-mode-spec.md`](docs/elder-mode-spec.md)
- 依據總表（競賽規則、法規、授權、套件盤點）：[`docs/research-basis.md`](docs/research-basis.md)
- 本屆題目「數位平權 × 友善共融／用不了」的用戶研究（每條主張標 ✅ 已查證／⚠️ 未查證；未查證的不可寫成「研究指出」）：
  - 長輩、視障、聽障的使用障礙、WCAG 規範、**WebView 技術限制**（TTS／語音辨識／麥克風／相機／羅盤／字級放大）：[`docs/accessibility-research.md`](docs/accessibility-research.md)
  - 長輩的數位習慣、臺北市近四年長者服務、微服務做法：[`docs/taipei-elderly-services.md`](docs/taipei-elderly-services.md)
  - 視障、聽障的使用習慣、臺北市相關服務與溝通管道、微服務做法：[`docs/taipei-disability-services.md`](docs/taipei-disability-services.md)
  - 補助的資格、金額、應備文件、申請管道、代辦：[`docs/taipei-subsidies.md`](docs/taipei-subsidies.md)
- 防詐先問一下（M11）的 165 官方文章查證紀錄：[`docs/antifraud-research.md`](docs/antifraud-research.md)
- README 引用了 `docs/diagrams/*.svg` 和部分文件，改檔名或刪檔前先搜尋引用處。

## 4. App 開發慣例（`townpass/`）

- **UI 一律照 Figma「Town Pass UI Kit」**。使用 `TPColors`、`TPTextStyles`、`TPText`、`TPButton`、`TPAppBar` 等既有元件，不要寫死色碼和字級。詳見 design-system.md。
- 無障礙：觸控目標 ≥ 48×48、文字放大到 200% 仍可閱讀、圖示要有語意標籤、每頁一個 AppBar 標題、不使用閃爍內容。
- 自訂 Handler 的 `name` 不可和內建的 9 個重複（見 adding-a-service.md §3）。
- 套件或版本資訊不確定時，以 `townpass/pubspec.yaml`、`townpass/pubspec.lock` 和官方文件為準，不要依賴模型記憶（Flutter 3.47、AGP 9 都很新）。
- 寫出來的程式碼要讓隊員看得懂；決選有問答環節，評審會問到設計考量。
- Demo 流程：開啟 App → 服務 › 更多 → 找到服務 → 完成一條流程 → 回到首頁。一律用實機測試。

## 5. 網頁開發慣例（根目錄）

### 5.1 和城市通 App 溝通

- **一律透過 `src/lib/townpass/bridge.ts`（內建 Handler）與 `elder.ts`（新增 Handler）**，不要在元件裡直接碰 `window.flutterObject`。
- 只能在 `'use client'` 元件的事件 handler 或 `useEffect` 裡呼叫，server component 和 SSR 階段沒有 `window`。
- 判斷「是否在 App 內」要用 `useSyncExternalStore(subscribe, isInTownPass, () => false)`，避免 hydration 不一致。
- `cacheComponents` 開啟時，Next.js 會用 `<Activity>` 保留已離開的頁面。effect 會被清除再重建，所以監聽器一定要在 cleanup 移除（`callApp` 已經處理好）。
- 不要用 `window.open`、`target="_blank"`、`alert`、`confirm`：App 的 WebView 不支援。要開連結改用 `openLink()`，提示訊息用自己做的 Dialog。
- 雙向溝通只能在 App 內驗證，一般瀏覽器會自動改用 `mock.ts`。

### 5.2 開放資料（一律走代理）

- 網頁**不要直接 fetch data.taipei**：多數來源沒開 CORS、有的是 Big5、有的是 TWD97 座標。一律用 `src/lib/opendata/client.ts` 的 `getOpenData(id, { near, radius, limit, q })`，它會呼叫 `/api/opendata/<id>`。
- 可用來源：`GET /api/opendata` 會列出全部；定義在 `src/lib/opendata/sources.ts`（白名單）。
- CSV 來源保留**原始中文欄位名**（例如 `r["公廁名稱"]`），另外加上 `lat`／`lng`；用 `near` 查詢時還會附上 `distance`（公尺）。youbike、parking、construction 已經整理成英文欄位。
- **新增來源**：先實際下載確認格式、編碼、座標欄位，再加進 `sources.ts`（大多數 CSV 只要 `csvSource({...})` 一行），並在 README「資料來源」補上出處。**不要把代理改成接受任意網址**（會變成 SSRF 跳板）。
- 各資料集的欄位、編碼、已知問題：`docs/open-data.md`。
- 測試用 `src/lib/opendata/fixtures/` 裡實際下載的原始檔跑完整流程。座標轉換用河濱租借站資料當基準。

### 5.3 UI 規範

- 視覺照 Figma「Town Pass UI Kit」，設計基準寬度 375px。**元件的 node id 先查 `docs/figma/inventory.md`**，不要直接呼叫 Figma MCP（Starter 方案每月只有約 6 次）。真的需要讀元件細節時，先問使用者，讀到的結果存回 `docs/figma/`。
- 顏色**優先用語意色**：`text-text-primary`／`text-text-second`／`text-text-description`、`bg-bg-light`／`bg-bg-dark`、`bg-disable`、`bg-alarm`（警示）、`bg-reminder`（提醒）、`border-divider`。沒有合適的語意色時，才用色階（`primary`、`secondary`、`grayscale`、`red`、`orange` 的 50～950）。Tailwind 內建色盤已經清空，`bg-blue-500` 之類的 class 不會生效。不要用 `red-400`（值待確認）。
- 按鈕照 UI Kit 的 5 種狀態：Primary（`bg-primary-500`）、Second、Alarm（`bg-alarm`）、Reminder（`bg-reminder`）、Disable（`bg-disable`）。尺寸 M 是 175×48，L 是 366×56。
- 字級使用 `text-h1`／`text-h2`／`text-title`／`text-h3`／`text-body`／`text-caption`。h1、h2、body 已經內建 Figma 的行高。
- App 已經有 AppBar（顯示 `<title>`），頁面內**不要再做重複的標題列**。
- 無障礙：觸控目標至少 48×48（`min-h-12`）、圖示要有 `aria-label`、字級用 rem、不禁止縮放、不使用閃爍效果。
- 以手機寬度 360～430px 為主，版面寬度上限 `max-w-md`。

### 5.4 「用得了」開發規範（各模組一律遵守）

規格：`docs/elder-mode-spec.md`（模組、介面規範 §4、色票 §4.1）。

**一定要用共用元件，不要自己重做**
- 頁面：`PageShell`（回首頁＋h1＋載入時焦點移到 h1）。首頁類畫面自己的 h1 要用 `useFocusOnMount`。
- 服務：資料只放在 `src/data/services.json`（M3），用 `ServiceCard` 顯示，用 `useRunAction` 執行動作。**不要在元件裡直接呼叫 bridge 的 phoneCall／openLink 等**，撥號確認、文字管道、失敗提示才會一致。
- 按鈕：`ServiceLink`／`ServiceAction`（`src/components/elder/ServiceButton.tsx`）。顏色用 `CATEGORY_STYLE` 或 `bg-elder-*`／`text-on-elder-*` token；紅色 `bg-elder-help` 只給「求助」。
- 操作失敗：用 `useFailNote()`＋`<FailNote>`（`src/components/elder/FailNote.tsx`），錯誤訊息留在按鈕下方，不要只用會消失的提示。
- 字級：`text-elder-title`（32）、`text-elder-button`（28）、`text-elder-body`（20）；最小用 `text-h3`（16）。全部 rem。
- 狀態：`useElder()` 取得 `mode`、`user`、`now`、`textScale`、`rate`。日期一律用 `now`（不要在元件裡 `new Date()`，Cache Components 會擋）。

**回饋（VoiceOver／TalkBack 一定要能用）**
- 按下當下：`announce(按鈕名稱)`（震動＋大字＋唸；報讀軟體開著時只震動）。
- 操作結果：`say(結果)`，例如「找到 3 個」「打不開」「設定好了」。一律寫進 live region，報讀軟體會唸。
- 每個可互動元素都要有**可見文字**當名稱；圖示一律 `aria-hidden`（`Icon` 元件已處理）。狀態用 `aria-pressed`。
- DOM 順序＝視覺順序；每頁一個 h1；區塊用 h2／h3，讓視障者可以用標題跳讀。
- 只用單指點一下，不用長按、滑動、雙指。語音一律「點一下開始、再點一下停止」，開始收音時只震動不出聲（避免錄到報讀軟體的聲音）。
- **不要唸兩次**：
  - 換畫面時焦點移到新標題，報讀軟體會自己唸標題。這時寫成 `if (!a11y.screenReader) say(...)`。
  - 已經 `say()` 的訊息，畫面上的同一句不要再加 `role="alert"` 或 `aria-live`。
  - 不要從 App 端呼叫原生的無障礙通知：Android 已經棄用 `announceForAccessibility`（會打斷 TalkBack 正在唸的內容），官方建議改用 live region。我們的 live region 就是 `ElderProvider` 裡那一個 `role="status"`。

**報讀軟體機制：原生 App 和網頁的對照**（第三方報讀軟體走同一套系統無障礙 API，不需要個別支援）

| 機制 | Android | iOS | 網頁（我們的做法） |
|---|---|---|---|
| 無障礙標籤 | `contentDescription` | `accessibilityLabel` | 按鈕上的可見文字；必要時 `aria-label`；`img` 一定要有 `alt` |
| 添加焦點 | `importantForAccessibility` | `isAccessibilityElement` | 只用原生的 `<button>`、`<a>`、`<input>`；裝飾圖示 `aria-hidden`；不要在 `div` 上綁 `onClick` |
| 焦點順序 | `nextFocusForward` | `accessibilityElements` | DOM 順序＝視覺順序；不用正數 `tabindex`；不用 CSS `order` 改變順序 |
| 無障礙通知 | `announceForAccessibility`（已棄用） | `UIAccessibilityPostNotification` | `say()`／`announce()` 寫進 live region（`role="status"`） |
| 偵測報讀軟體 | 觸控探索開啟（含第三方報讀軟體） | VoiceOver 開啟 | App 的 `a11y_state` Handler 回傳 `screenReader` |

**檢查**：每完成一頁，用 `scripts/a11y-check.js` 在三種模式下各跑一次（貼到 Chrome DevTools 的 Console，用法寫在檔案開頭）；最後仍要用實機開 VoiceOver／TalkBack 聽一次。

**內容**
- 視障者用報讀軟體時習慣 3～5 倍速聆聽、會跳著聽：**重點放在標題和第一句**，不要開場白。自己唸（TTS）的速度用 `rate`，不要寫死。
- 聽不清楚模式：每個只能用講的動作旁邊都要有文字管道（`alt_channels`）；沒有就明白寫「只能用講的，可以請家人代打」。
- 電話、網址、金額、資格只能用 `docs/` 研究文件裡標 ✅ 的資料，附 `source` 與 `verified`。查不到就不要寫。
- 只說「可能可以申請」，不說「符合」；最後以主責機關審核為準。
- Demo 絕對不能真的送出 119／110 簡訊或撥號。

**測試**：純邏輯（資格判斷、比對、資料轉換）放 `src/lib/elder/*.ts`，先寫 `*.test.ts`（`node --test`）。完成前跑 `npm test`、`npm run lint`、`npx tsc --noEmit`、`npm run build`；有改 App 的話再跑 `cd townpass && fvm flutter analyze && fvm flutter test`。

### 5.5 Next.js 16 注意事項

- 這版的 Next.js 和訓練資料中的版本有差異，寫程式前先看 `node_modules/next/dist/docs/`（見 AGENTS.md）。
- `cacheComponents: true`：資料預設是動態的，要快取就用 `'use cache'` 搭配 `cacheLife`。GET Route Handler 沒有存取動態資料時，會在 build 時預先渲染；要每次請求都重新執行，就呼叫 `await connection()`。
- 不要寫 `export const runtime`（Cache Components 不支援）。
