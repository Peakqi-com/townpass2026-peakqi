# 台北通長輩模式

> 2026 臺北秋季程式設計節 · 城市通微服務大黑客松　參賽作品（AI城市起風 × 奇鋒國際 PEAKQI）
> **說一句話，城市就聽懂。** 長輩、視障者、聽障者用同一個入口，依「需求」而不是「機關」找到市府服務；每條路都有不靠聲音、也不靠眼睛的替代方式。

- 微服務網頁：https://townpass2026-peakqi.vercel.app/
- 修改後的城市通 App：[Peakqi-com/TownPass](https://github.com/Peakqi-com/TownPass)（新增 Handler 與權限，不改既有流程）
- 功能規格（開發以此為準）：[TownPass `docs/townpass/elder-mode-spec.md`](https://github.com/Peakqi-com/TownPass/blob/main/docs/townpass/elder-mode-spec.md)

---

## 1. 要解決的問題

- **誰**：長輩，以及同樣是長輩居多的視障者、聽障者。全國聽障者 76.3%、視障者 59.4% 年滿 65 歲（衛福部 2026-06）；臺北市 65 歲以上人口占 23.9%（主計處統計週報第 1355 號）。
- **在什麼時候**：要看醫生、叫車、辦補助、找附近的共餐據點，或遇到緊急狀況時。
- **遇到什麼困難**：
  - 市府服務依「機關」分類，要先知道「這件事歸誰管」，入口又散在電話、臨櫃和各局處網站。
  - 長輩卡在流程：用過健保快易通的長輩，42.2% 是靠別人幫忙操作（數發部 111 年調查）；「不知道有這個服務」約占 17／100。
  - 很多服務只能打電話，聽障者用不了；地圖和小字對視障者讀不到。

研究與出處見 TownPass repo 的 `docs/townpass/`（`accessibility-research.md`、`taipei-elderly-services.md`、`taipei-disability-services.md`、`taipei-subsidies.md`）。

## 2. 主要功能

| 模組 | 功能 | 狀態 |
|---|---|---|
| M0 | App 端橋接：朗讀、震動、無障礙狀態、開啟外部 App、裝置端語音辨識 | ✅ 完成（App 與網頁端） |
| M1 | 首頁與模式：4～6 個大按鈕；「看不清楚／聽不清楚／都還好」三種模式 | 🚧 開發中 |
| M2 | 找服務：打字、點選、說話，只回三個大按鈕 | ⏳ |
| M3 | 服務清單：跨局處的開源 JSON 規格（`phrases`、`alt_channels`、`eligibility`、`source`） | ⏳ |
| M4 | 我要看醫生：聯醫掛號、叫車、1966 一次列出 | ⏳ |
| M5 | 我要叫車：依身分分流到復康巴士、長照交通接送、敬老計程車 | ⏳ |
| M6 | 我的權益：敬老卡、重陽禮金、疫苗、健檢，依生日自動判斷 | ⏳ |
| M7 | 家人：用 QR code 幫長輩設定按鈕（不經過伺服器）、打給家人 | ⏳ |
| M8 | 聽不清楚：每個撥號按鈕旁的「用文字」、緊急求助卡、看診溝通卡 | ⏳ |
| M9 | 附近共餐、上課：依行政區篩選 | ⏳ |
| M10 | 視障出門：用一句話說明捷運無障礙設施與附近有聲號誌 | ⏳ |
| M12 | 補助小幫手：三題篩出「可能可以申請」的補助，產生家人代辦準備單 | ⏳ |

## 3. 系統架構

```
城市通 App（Flutter，TownPass fork）
   │  flutterObject 雙向溝通
   │  內建：userinfo、location、phone_call、1999agree、open_link、notify、qr_code_scan…
   │  新增：speak、a11y_state、haptic、open_external、listen
   ▼
Next.js 16（本 repo，部署在 Vercel 東京）
 ├─ 前端  src/app/**/page.tsx（React 19、Tailwind 4、城市通色票＋長輩模式色票）
 │        src/lib/townpass/bridge.ts、elder.ts（呼叫 App；一般瀏覽器自動改用 mock）
 └─ 後端  src/app/api/opendata/[source]/route.ts ──► data.taipei（白名單代理）
```

### 長輩模式新增的 App Handler

App 端程式在 TownPass 的 `lib/util/web_message_handler/elder_mode_message_handlers.dart`；網頁端呼叫方式在 `src/lib/townpass/elder.ts`。

| name | 網頁送出 | App 回覆 | 說明 |
|---|---|---|---|
| `speak` | `'叫車'` 或 `{ text, rate? }` | `true`／`false` | 系統 TTS（flutter_tts），語速預設 0.45、限制 0.2～0.7，文字上限 200 字 |
| `a11y_state` | `null` | `{ screenReader, textScale }` | 螢幕閱讀器開著時網頁不自己唸；`textScale` 用來設定根字級（城市通 WebView 不跟隨系統字級） |
| `haptic` | `'light'`／`'medium'` | `true` | 觸覺回饋（iOS WebView 不支援 `navigator.vibrate`） |
| `open_external` | 網址字串 | `true`／`false` | 用外部 App 開啟（LINE、簡訊、撥號畫面）。只允許 https、tel、sms、mailto |
| `listen` | `{ action: 'start'｜'stop'｜'cancel', locale? }` | 先回 `{ status: 'listening' }`，再回 `{ text }` 或 `{ error }` | 裝置端語音辨識。**只開放本服務網域**；手機不支援離線辨識時回 `offline_unavailable`，**不會改用雲端** |

### 開放資料代理

data.taipei 多數資料沒有開放 CORS，且部分為 Big5 編碼、TWD97 座標，因此由後端代理：

```
GET /api/opendata                                    列出可用來源
GET /api/opendata/<id>?near=緯度,經度&radius=500&limit=20&q=關鍵字
```

- 只代理 `src/lib/opendata/sources.ts` 登記的來源（白名單），不接受任意網址
- 統一轉成 JSON，TWD97 座標換算為 WGS84，可依位置篩選附近的點（附 `distance` 公尺），或用 `q` 依行政區等文字篩選
- 依來源更新頻率設定 CDN 快取（`s-maxage`），上游暫時失敗時回傳最近一次的資料（`stale: true`）

## 4. 執行方式

需求：Node.js 24 以上。

```bash
npm ci
cp .env.example .env.local   # 目前用到的資料來源都不需要金鑰
npm run dev                  # http://localhost:3000（一般瀏覽器會自動使用 mock 資料）
npm test                     # 單元測試（node --test）
npm run lint
```

在城市通 App 內測試：

1. 部署到 HTTPS 網址（App 的 WebView 無法開啟 http），或用 ngrok 對外提供本機服務
2. 新網域要加進 TownPass 的 `lib/util/elder_mode_config.dart` 的 `trustedHosts`，否則 `listen` 會回 `forbidden`
3. TownPass 已在 `my_service_model.dart` 登記本服務並預設置頂；`fvm flutter run` 後到「服務」頁開啟
4. 首頁下方的「長輩模式 App 能力測試」可以逐一測試新增的 Handler。語音辨識請開飛航模式再測一次

### 部署

**Vercel**（目前使用）：匯入本 repo 即可。Function 區域設定在 `vercel.json`（`hnd1` 東京）。

**容器（Cloud Run 或其他）**：本 repo 附 `Dockerfile`（Next.js standalone 輸出），可以不依賴 Vercel 自行部署：

```bash
gcloud run deploy townpass2026-peakqi --source . --region asia-east1
# 或在本機執行
docker build -t townpass2026-peakqi . && docker run -p 8080:8080 --env-file .env.local townpass2026-peakqi
```

### 環境變數

| 名稱 | 用途 | 取得方式 |
|---|---|---|
| `TDX_CLIENT_ID`／`TDX_CLIENT_SECRET` | 目前沒有用到；之後若接 TDX 交通資料才需要 | [TDX](https://tdx.transportdata.tw/) 免費註冊 |

金鑰只放在 `.env.local`，不可 commit。

## 5. 資料來源

授權：政府資料開放授權條款第 1 版。代理目前登記的全部來源可用 `GET /api/opendata` 查詢；下表列出長輩模式使用（或規劃使用）的資料集。

| 資料集 | 提供機關 | 連結 | 用途 | 狀態 |
|---|---|---|---|---|
| 公私立醫院 | 衛生局 | [b02cd6b2…](https://data.taipei/dataset/detail?id=b02cd6b2-79be-4d7f-ae78-305b2af668f5) | M4 我要看醫生 | 規劃中 |
| 老人共餐單位一覽表 | 社會局 | [fe55795c…](https://data.taipei/dataset/detail?id=fe55795c-a220-4b88-bde1-5b994321f8af) | M9 附近共餐 | 規劃中 |
| 社區照顧關懷據點 | 社會局 | [d082dc87…](https://data.taipei/dataset/detail?id=d082dc87-d3fd-479d-89c6-745ff1be955a) | M9 | 規劃中 |
| 長青學苑 | 社會局 | [67b63404…](https://data.taipei/dataset/detail?id=67b63404-89b8-4214-8096-3322204144e6) | M9 | 規劃中 |
| 樂齡學習據點 | 教育局 | [ca59e66b…](https://data.taipei/dataset/detail?id=ca59e66b-7200-4283-8c32-08bde2f5f142) | M9 | 規劃中 |
| 流感疫苗合約醫療院所（成人） | 衛生局 | [0db13d34…](https://data.taipei/dataset/detail?id=0db13d34-51e3-497a-a023-286d5ef692ea) | M6 疫苗 | 規劃中 |
| 臺北捷運車站無障礙設施資料 | 捷運公司 | [3c799405…](https://data.taipei/dataset/detail?id=3c799405-4e44-40dd-b747-daed09e88cdb) | M10 視障出門 | 規劃中 |
| 臺北捷運車站出入口無障礙電梯、坡道座標 | 捷運公司 | [0a3bb422…](https://data.taipei/dataset/detail?id=0a3bb422-9eb5-459b-a9d4-138456516183) | M10 | 代理已登記 |
| 交工處無障礙設施設置資料（有聲號誌） | 交通局 | [baf32b58…](https://data.taipei/dataset/detail?id=baf32b58-b194-448d-96a0-ba04013d164f) | M10 | 規劃中 |

服務清單（M3）裡的電話、網址、補助資格與金額，是隊員從市府官網整理後寫入的，每筆都附 `source` 與 `verified`（查證日期）。

> 核心資料使用合法開放資料；如有模擬資料會在此標示。

## 6. 第三方套件

**本 repo（微服務網頁）**

| 套件 | 授權 |
|---|---|
| next | MIT |
| react、react-dom | MIT |
| tailwindcss、@tailwindcss/turbopack | MIT |
| typescript | Apache-2.0 |
| eslint、eslint-config-next | MIT |

**TownPass fork 新增的 Flutter 套件**

| 套件 | 授權 | 用途 |
|---|---|---|
| flutter_tts 4.2.5 | MIT | `speak` |
| speech_to_text 7.5.0 | BSD-3-Clause | `listen` |

## 7. AI 使用聲明

- **開發階段**：使用 Claude Code 協助研究資料、撰寫程式與測試、起草文件；程式碼與資料來源皆經隊員閱讀確認。
- **執行階段**：**不使用任何大型語言模型**，也不呼叫任何雲端 AI API。服務比對使用關鍵字規則。語音辨識使用手機作業系統內建的**裝置端**辨識引擎：

| 項目 | 內容 |
|---|---|
| 模型名稱 | 不自備模型；使用作業系統內建的語音辨識（Android `SpeechRecognizer` 裝置端辨識器、iOS `SFSpeechRecognizer`） |
| 版本 | 依手機作業系統版本 |
| 量化格式 | 不適用 |
| 推論框架 | speech_to_text 7.5.0（BSD-3-Clause），設定 `onDevice: true` |
| 來源 | 手機作業系統 |

> 依競賽規範，執行時的推論都在裝置端完成：iOS 設定 `requiresOnDeviceRecognition`；Android 先確認 `SpeechRecognizer.isOnDeviceRecognitionAvailable`，不支援就停用語音、改用打字，不會改用雲端辨識。

## 8. 評估面向對照

| 面向 | 本作品的做法 |
|---|---|
| 安全（個資保護、防攻擊、能被監督） | 語音只在手機裡辨識；補助篩選的答案只存在手機；家人設定用 QR code 直接傳遞，不經過伺服器。麥克風只開放本服務網域；`open_external` 只允許 4 種 scheme；開放資料代理採白名單 |
| 創新（新想法、能持續改） | 一個入口照顧三類人（模式只改變行為、不改內容）；服務清單是開源 JSON，局處可以自行補「長輩的說法」 |
| 有感（解決需求、可擴充） | 依需求而不是機關找服務；一按就撥號或開官方頁面；主動告訴長輩「你有這個權益」 |
| 參與（方便表達意見、參與社區） | 附近共餐、關懷據點、長青學苑；家人與里辦志工可以協助設定 |
| 便利（數位歸戶、無縫接軌、主動推薦） | 用 `userinfo` 的生日與行政區自動判斷資格、帶出同區據點 |
| 透明（用語淺白、即時更新、指引清楚） | 每筆服務標示主責機關、官方連結與查證日期；補助只說「可能可以申請」，最後由社會局審核 |

## 9. 維運說明

- **資料由誰更新**：開放資料由各局處在 data.taipei 更新，代理即時抓取。服務清單（電話、網址、補助資格）是一份 JSON，規劃由各局處自行維護；每筆都有查證日期，方便定期檢查。
- **問題由誰處理**：得獎後協助資訊局整併；程式架構與測試說明見本 README 與 TownPass `docs/townpass/`。

## 授權

本專案採 [GNU AGPL-3.0](LICENSE) 授權。

TODO：附上主辦單位指定的授權聲明。
