<h1 align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="docs/readme/banner-dark.svg">
    <img src="docs/readme/banner-light.svg" width="100%" alt="用得了：不方便的時候，也用得了。說一句話，城市就聽懂。右邊的手機輪流示範三種模式（都還好、看不清楚、聽不清楚）按下「看醫生」時的回饋">
  </picture>
</h1>

<p align="center">
  <b>不方便的時候，也用得了。</b><br>
  為長輩，以及行動、視力、聽力不方便的人設計；懷孕、受傷、陪伴家人的時候也用得到。<br>
  說一句話，依「需求」而不是「機關」找到市府服務；每條路都有不靠聲音、也不靠眼睛的替代方式。
</p>

<p align="center">
  <a href="https://townpass2026-peakqi.vercel.app/"><img src="docs/readme/btn-demo.svg" height="52" alt="線上試用（微服務網頁）"></a>
  <a href="#評審試用路徑約-2-分鐘"><img src="docs/readme/btn-judge.svg" height="52" alt="評審 2 分鐘試用路徑"></a>
  <a href="docs/elder-mode-spec.md"><img src="docs/readme/btn-spec.svg" height="52" alt="功能規格（開發以此為準）"></a>
  <a href="townpass/"><img src="docs/readme/btn-app.svg" height="52" alt="修改後的城市通 App 原始碼"></a>
</p>

<p align="center">
  <img src="docs/readme/badge-nextjs.svg" alt="Next.js 16">
  <img src="docs/readme/badge-flutter.svg" alt="Flutter 3.47">
  <img src="docs/readme/badge-license.svg" alt="授權 AGPL-3.0">
  <img src="docs/readme/badge-ai.svg" alt="執行時不使用雲端 AI">
  <img src="docs/readme/badge-speech.svg" alt="語音辨識只在手機上">
  <img src="docs/readme/badge-offline.svg" alt="斷網：打開後仍可用">
</p>

<p align="center"><sub>
  2026 臺北秋季程式設計節・城市通微服務大黑客松 參賽作品｜AI城市起風 × 奇鋒國際 PEAKQI<br>
  微服務網頁 https://townpass2026-peakqi.vercel.app/ ・修改後的城市通 App 在 <a href="townpass/"><code>townpass/</code></a>（新增 Handler 與權限，不改既有流程）<br>
  開發代號「長輩模式」：程式碼、規格文件裡的「長輩模式」都是指本服務
</sub></p>

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="docs/readme/glance-dark.svg">
  <img src="docs/readme/glance-light.svg" width="100%" alt="一眼看懂：3 種模式、17 個功能模組、32 筆跨局處服務、37 個開放資料來源、6 個新增 App 能力、0 次呼叫雲端 AI">
</picture>

<p align="center">
  <a href="docs/demo/walk-to-bus-stop.mp4"><img src="docs/demo/walk-to-bus-stop-preview.gif" width="240" alt="實地 Demo 片段：走到路口時 App 震動並念出「現在右轉，進入忠誠路二段，要過馬路，這裡有有聲號誌，聽到嗶嗶聲再走」，右上角是對應的 App 畫面"></a><br>
  <sub>▶ <a href="docs/demo/walk-to-bus-stop.mp4">實地 Demo（89 秒）</a>：看不清楚螢幕，只靠語音＋震動，過兩個有聲號誌路口走到公車站<br>
  右上角是重現的 App 畫面；畫面上的公尺數、公車分鐘數是示意值</sub>
</p>

<p align="center">
  <a href="#1-要解決的問題">問題</a> ・
  <a href="#2-設計原則">原則</a> ・
  <a href="#3-主要功能">功能</a> ・
  <a href="#4-系統架構">架構</a> ・
  <a href="#5-主要流程">流程</a> ・
  <a href="#6-設計取捨">取捨</a> ・
  <a href="#7-執行方式">執行</a> ・
  <a href="#8-資料來源">資料來源</a> ・
  <a href="#9-第三方套件">套件</a> ・
  <a href="#10-ai-使用聲明">AI 聲明</a> ・
  <a href="#11-評估面向對照">評估對照</a> ・
  <a href="#12-維運說明">維運</a> ・
  <a href="#授權">授權</a>
</p>

---

## 1. 要解決的問題

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="docs/readme/stats-dark.svg">
  <img src="docs/readme/stats-light.svg" width="100%" alt="聽障者 76.3% 年滿 65 歲、視障者 59.4% 年滿 65 歲（衛福部 2026-06）；臺北市人口 23.9% 是 65 歲以上（主計處統計週報第 1355 號）；用健保快易通的長輩 42.2% 靠別人幫忙操作（數發部 111 年調查）">
</picture>

- **誰**：長輩，以及行動、視力、聽力不方便的人；懷孕、受傷、陪伴家人的時候也用得到。主要對象是長輩與同樣是長輩居多的視障者、聽障者。全國聽障者 76.3%、視障者 59.4% 年滿 65 歲（衛福部 2026-06）；臺北市 65 歲以上人口占 23.9%（主計處統計週報第 1355 號）。
- **在什麼時候**：要看醫生、叫車、辦補助、找附近的共餐據點，出門要找無障礙廁所、電梯、哺集乳室，或遇到緊急狀況時。
- **遇到什麼困難**：
  - 市府服務依「機關」分類，要先知道「這件事歸誰管」，入口又散在電話、臨櫃和各局處網站。
  - 長輩卡在流程：用過健保快易通的長輩，42.2% 是靠別人幫忙操作（數發部 111 年調查）；「不知道有這個服務」約占 17／100。
  - 很多服務只能打電話，聽障者用不了；地圖和小字對視障者讀不到。

研究與出處見 `docs/`（`accessibility-research.md`、`taipei-elderly-services.md`、`taipei-disability-services.md`、`taipei-subsidies.md`）。

## 2. 設計原則

全國聽障者 76.3%、視障者 59.4% 年滿 65 歲，**他們大多就是長輩**。所以視障、聽障做成「模式」，不另外做服務，一個入口照顧三類人。

| # | 原則 | 為什麼 |
|---|---|---|
| 1 | **動作要熟**：按鈕的結果只有撥電話、開 LINE、開一頁大字說明 | 長輩上網者 95.1% 用即時通訊 |
| 2 | **選項要少**：首頁 4～6 個大按鈕，由家人挑選；其餘服務用說的或打字找 | W3C WAI-AGE |
| 3 | **每個回饋至少兩種感官**：唸出來＋大字＋震動；螢幕閱讀器開著時不自己唸 | 避免和 VoiceOver／TalkBack 重複播報 |
| 4 | **只能用聲音完成的路，旁邊都有一條文字路**，兩個按鈕一樣大 | 聽障者最大的困境是無法接聽電話 |
| 5 | **按錯不怕**：每頁只有一個「回首頁」；撥號前有確認頁；不自動逾時、不自動跳頁 | WCAG 2.2.1 |
| 6 | **主動告訴長輩「你有這個權益」**：用生日和行政區帶出符合資格的內容 | 「不知道有這個服務」約 17／100 |
| 7 | **家人是共同使用者**：設定和緊急聯絡有家人參與，但長輩自己操作 | 用健保快易通的長輩 42.2% 靠別人操作 |
| 8 | **只放官方電話和網址**，標出主責機關和查證日期；來源矛盾時明白寫出來 | 119 簡訊號碼有兩個官方版本 |
| 9 | **不在 Demo 送出真實求救**：119、110 只顯示範本，由使用者自己按送出 | — |

數字的出處見 `docs/` 的研究文件（`accessibility-research.md`、`taipei-elderly-services.md`、`taipei-disability-services.md`）。

## 3. 主要功能

| 模組 | 頁面 | 功能 | 狀態 |
|---|---|---|---|
| M0 | （App 端） | App 端橋接：朗讀、震動、無障礙狀態、開啟外部 App、裝置端語音辨識 | ✅ |
| M1 | `/`、`/mode` | 首頁與模式：6 個大按鈕、重陽禮金提醒、固定的 1999／1966／求助；「都還好／看不清楚／聽不清楚」三種模式，可調整唸的速度 | ✅ |
| M2 | `/find` | 找服務：打字、點選分類、說話（點一下開始、再點一下停止），用關鍵字比對（頁面打開後斷網也能用，見下方「斷網」） | ✅ |
| M3 | `src/data/services.json` | 服務清單：跨局處的開源 JSON（`phrases`、`alt_channels`、`audience`、`source`、`verified`），目前 31 筆 | ✅ |
| M4 | `/health` | 我要看醫生：聯醫掛號、叫車、1966 一次列出；聽不清楚模式加看診溝通卡、手語翻譯。**看完醫生之後**：選回診或領慢性病連續處方箋的日子，前一天晚上 7 點跳出手機通知（斷網也會響），並可「傳給家人知道」 | ✅ |
| M5 | `/ride` | 我要叫車：最多兩題，分流到復康巴士、長照交通接送、敬老計程車；每個結果都有「訂不到車怎麼辦？」，依序列出下一個選項，最後是打給家人 | ✅ |
| M6 | `/benefits` | 我的權益：最上面是「很多人不知道的權益」（老人健保費補助、長照交通接送、照顧家人），接著是重陽禮金（「還沒收到嗎？」，可以「提醒我申請」）、敬老卡、公費疫苗、老人健檢，依生日與戶籍自動判斷 | ✅ |
| M7 | `/family`、`/family/setup` | 家人：家人用 QR code 幫長輩設定首頁按鈕與聯絡人（不經過伺服器）、打給家人 | ✅ |
| M8 | `/text`、`/help`、`/card/clinic` | 聽不清楚：文字聯絡管道、全螢幕求助卡、119 簡訊範本、看診溝通卡與手語翻譯申請文字。求助頁分成「現在有危險」與「接到可疑電話」兩條，危險那條可以「讓家人知道」 | ✅ |
| M9 | `/community` | 附近吃飯、上課：依行政區列出共餐、關懷據點、長青學苑、樂齡學習、老人服務中心 | ✅ |
| M10 | `/vision` | 視障出門：用一句話說出最近捷運站的電梯位置、異常公告與附近有聲號誌 | ✅ |
| M11 | `/antifraud` | 防詐先問一下：點選或打出（也可以說）對方說了什麼，在手機裡比對 6 種常見詐騙說法，說「這很像〇〇詐騙」＋165 全民防騙網的官方提醒，再一鍵打給家人或 165；比對不到時只說「不確定，先停下來」，絕不說「安全」 | ✅ |
| M12 | `/benefits/subsidy` | 補助小幫手：先問「幫自己還是幫另一半或家人」（幫家人時改問他的年紀），再用三題篩出「可能可以申請」的補助，附應備文件、戶籍地社會課、打電話時的第一句話與家人代辦準備單（可以直接傳給家人）；找不到時給 1957、1966、文字聯絡，不停在「沒有」；含假牙補助（先到聯醫做口腔檢查，由醫院送件） | ✅ |
| M13 | `/shelter` | 颱風、地震時去哪裡：用台北通帳號的「里」找出負責的避難收容處所，不用輸入地址；可選颱風淹水或地震，有無障礙設施、和家同一條路的排前面 | ✅ |
| M14 | `/care` | 照顧家人：失智症篩檢合約醫院、喘息服務特約單位（依服務範圍）、家庭照顧者服務中心、健康服務中心 | ✅ |
| M15 | `/health/places` | 打疫苗、做篩檢：依行政區列出公費流感、肺炎鏈球菌疫苗、五癌篩檢的合約院所，以及假牙補助院所 | ✅ |
| M16 | 首頁、`/family/setup` | 公車還有幾分鐘到：家人在「幫長輩設定」選路線、方向、站牌（最多 2 組，臺北、新北都可以），編進設定碼；長輩首頁每 30 秒更新「307 往撫遠街・南京三民路口，還有 7 分鐘」，按「再查一次」會唸出來。**帶我走到站牌**（`/walk`）：在手機上算步行路線，比較走路和公車時間（趕不上就說等下一班），轉彎、過馬路前先提醒並震動，有有聲號誌就提醒聽嗶嗶聲；斷網也能用，路網目前只涵蓋會場周邊 | ✅ |
| M17 | `/nearby` | 附近哪裡可以用：坐輪椅、拿拐杖、懷孕、受傷，或陪家人出門的時候，用目前位置找最近的無障礙廁所、捷運電梯、親子廁所、AED（各列最近 3 個、直線距離、「怎麼去」開 OpenStreetMap）；哺集乳室的資料沒有座標，依台北通帳號的行政區列出 | ✅ |

「傳給家人知道」只打開簡訊 App 並帶好內文，不會自動送出，也不經過伺服器；沒設定家人時可以複製貼到 LINE。各頁都已用瀏覽器在三種模式下檢查報讀（見下方「無障礙」）。

> [!NOTE]
> 尚未用實機開 VoiceOver／TalkBack 完整實測。

### 三種模式

模式只改變行為，服務內容都一樣。第一次使用會先選模式，之後隨時可以換（`src/components/elder/ModePicker.tsx`）。

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="docs/readme/modes-dark.svg">
  <img src="docs/readme/modes-light.svg" width="100%" alt="三種模式的首頁並排比較（動畫：三支手機同時按下「看醫生」，都會震動、上方跳出大字「看醫生」，都還好和看不清楚模式唸出來，聽不清楚模式顯示靜音）。都還好：按下按鈕會震動、顯示大字、唸出名稱，字級跟手機設定。看不清楚：字至少放大 1.3 倍，一樣震動、大字、唸出名稱。聽不清楚：不出聲音，只震動和大字；1999 改成「1999 文字」，只能打字找服務，文字管道排在電話前面">
</picture>

| | 都還好 | 看不清楚 | 聽不清楚 |
|---|---|---|---|
| 按下按鈕 | 震動＋大字＋唸出名稱 | 同左 | 震動＋大字，**不出聲音** |
| 字級 | 跟手機設定 | **至少放大 1.3 倍** | 跟手機設定 |
| 唸的速度 | 可調，預設「慢」 | 可調，預設「正常」，可以調到最快 | 不顯示（不唸） |
| 找服務 | 說話或打字 | 說話或打字 | **只有打字** |
| 首頁的 1999 | 直接撥號 | 直接撥號 | **改成「1999 文字」** |
| 電話與文字管道 | 電話在前 | 電話在前 | **文字在前**；只能打電話的服務會明講，並給替代方式 |
| 其他 | — | 搜尋同分時，視障相關服務排前面 | 看診溝通卡、手語翻譯、119 簡訊排在撥號前；叫車結果加上手語視訊轉譯 |

螢幕閱讀器開著時，三種模式都不自己唸，交給 VoiceOver／TalkBack。

## 4. 系統架構

![「用得了」架構：使用者從城市通 App 的服務頁開啟「用得了」，TPWebView 用 HTTPS 載入本微服務（Next.js，前端頁面 M1～M17），微服務的 bridge 用 postMessage 和 App 的 TPWebMessageListener 雙向溝通，分派給內建 Handler 與本服務新增的 6 個 Handler；後端 /api/opendata 代理 data.taipei 開放資料，/api/bus 讀公運處的公車資料。動畫：資料流從使用者開始，一段一段沿著連線亮起來](docs/diagrams/architecture.svg)

<details>
<summary>文字版</summary>

```
使用者：長輩・視障者・聽障者
① 城市通 App（townpass/・TownPass fork・Flutter 3.47.6）
   服務頁「用得了」（my_service_model.dart，預設置頂）→ TPWebView（flutter_inappwebview）
        │ HTTPS 載入網頁
② 「用得了」微服務（根目錄・Next.js 16・React 19・Tailwind 4・Vercel 東京）
   前端頁面 M1～M17
   ├ services.json：M3 服務清單 31 筆（打包在前端，斷網可用）
   ├ public/walk/：步行路網（OSM，開發時下載一次；路線在手機上算，斷網可用）
   ├ bridge.ts・elder.ts：呼叫 App 能力；一般瀏覽器改用 mock
   └ 後端 Route Handlers
       ├ /api/opendata：白名單代理、Big5 轉碼、ODS 解析、TWD97 換算、CDN 快取 ──HTTPS──► data.taipei（37 個來源）
       └ /api/bus：路線、站牌、預估到站（M16）──HTTPS──► 公運處公車資料（白名單 6 個網址）
        │ postMessage 雙向溝通
③ App 原生能力：flutterObject ⇄ TPWebMessageListener，依訊息名稱分派
   內建（官方）：userinfo・location・phone_call・1999agree・open_link・launch_map・notify・qr_code_scan
   新增：speak（flutter_tts）・a11y_state（報讀軟體、字級）・haptic（震動）
         open_external（url_launcher：LINE、簡訊，含「傳給家人知道」）・listen（speech_to_text，只在手機上辨識）
         reminder（flutter_local_notifications：重陽禮金、回診、領藥的手機通知）
```

</details>

程式位置：
- 前端頁面：`src/app/**/page.tsx`（城市通色票＋本服務的按鈕色票，見下方「無障礙」）
- 呼叫 App：`src/lib/townpass/bridge.ts`（內建 Handler）、`src/lib/townpass/elder.ts`（新增 Handler）；一般瀏覽器會自動改用 mock
- 後端：`src/app/api/opendata/[source]/route.ts`（開放資料代理）、`src/app/api/bus/`（公車，M16）
- 傳給家人：`src/components/elder/ShareToFamily.tsx`（回診提醒、補助準備單、求助頁共用）
- 步行導航：`src/lib/elder/walk.ts`（A* 算路線、提醒判斷，有測試）、`src/components/elder/WalkScreen.tsx`；路網由 `scripts/build-walk-graph.ts` 在開發時產生 `public/walk/tianmu.json`

架構圖與下一節的流程圖，由 `docs/diagrams/build_diagrams.py` 產生（只用 Python 標準函式庫，色票取自城市通 UI Kit）。要改圖時改那支程式再重跑 `python3 docs/diagrams/build_diagrams.py`，不要手改 SVG。流程圖的動畫、旁邊的情境手機與逐步說明在 `docs/diagrams/build_flow_motion.py`（手機畫面照 `src/` 的程式畫，共用 `docs/diagrams/phone_kit.py`），跑同一個指令就會一起產生；系統設定「減少動態效果」時停在完整的靜止畫面。README 開頭的橫幅、按鈕、徽章與數字卡片同樣由 `docs/readme/build_readme_art.py` 產生（`python3 docs/readme/build_readme_art.py`）。

### 新增的 App Handler

App 端程式在 `townpass/lib/util/web_message_handler/elder_mode_message_handlers.dart`；網頁端呼叫方式在 `src/lib/townpass/elder.ts`。

| name | 網頁送出 | App 回覆 | 說明 |
|---|---|---|---|
| `speak` | `'叫車'` 或 `{ text, rate? }` | `true`／`false` | 系統 TTS（flutter_tts），語速預設 0.45、限制 0.2～1.0，文字上限 200 字。螢幕閱讀器開著時網頁不呼叫 |
| `a11y_state` | `null` | `{ screenReader, textScale }` | 螢幕閱讀器開著時網頁不自己唸；`textScale` 用來設定根字級（城市通 WebView 不跟隨系統字級） |
| `haptic` | `'light'`／`'medium'` | `true` | 觸覺回饋（iOS WebView 不支援 `navigator.vibrate`） |
| `open_external` | 網址字串 | `true`／`false` | 用外部 App 開啟（LINE、簡訊、撥號畫面）；「傳給家人知道」也用它打開簡訊，只帶好內文、不自動送出。只允許 https、tel、sms、mailto |
| `listen` | `{ action: 'start'｜'stop'｜'cancel', locale? }` | 先回 `{ status: 'listening' }`，再回 `{ text }` 或 `{ error }` | 裝置端語音辨識。**只開放本服務網域**；手機不支援離線辨識時回 `offline_unavailable`，**不會改用雲端** |
| `reminder` | `{ action: 'set', id, title, body, at }`／`{ action: 'cancel', id }` | `{ status: 'scheduled', at }`／`{ status: 'cancelled' }`／`{ error }` | 排程手機通知，App 關掉也會跳（flutter_local_notifications）：重陽禮金截止前、回診或領藥前一天晚上 7 點。**只開放本服務網域**；`at` 要帶時區，限 1 分鐘後到 400 天內 |

### 開放資料代理

data.taipei 多數資料沒有開放 CORS，且部分為 Big5 編碼、TWD97 座標，因此由後端代理：

```
GET /api/opendata                                    列出可用來源
GET /api/opendata/<id>?near=緯度,經度&radius=500&limit=20&q=關鍵字
```

- 只代理 `src/lib/opendata/sources.ts` 登記的來源（白名單），不接受任意網址
- 統一轉成 JSON（含 .ods 試算表，用 Node 內建 zlib 解壓，不需要套件），TWD97 座標換算為 WGS84，可依位置篩選附近的點（附 `distance` 公尺），或用 `q` 依行政區等文字篩選
- 依來源更新頻率設定 CDN 快取（`s-maxage`），上游暫時失敗時回傳最近一次的資料（`stale: true`）

### 公車 API（M16）

公車資料量大（站牌檔解壓後約 10 MB），不走通用代理，另外做三支只回傳需要內容的 API（`src/app/api/bus/`、`src/lib/bus/`）：

```
GET /api/bus/routes?q=307                      用名稱找路線（臺北＋新北）
GET /api/bus/stops?city=tpe&route=16111        一條路線兩個方向的站牌
GET /api/bus/eta?t=tpe:16111:15276,…           預估到站（一次最多 4 組，只回這幾筆）
```

- 資料是臺北市公運處的 blob（白名單 6 個固定網址），用 Node 內建 `zlib` 解壓，不需要套件，也不需要 TDX 金鑰。
- 路線、站牌快取一天；預估到站上游每 15～20 秒更新，伺服器快取 20 秒、CDN 15 秒；網頁端查詢一律 `cache: "no-store"`，斷網時不會把舊時間當成新的。
- 方向看站牌檔的 `goBack`；特殊值 `-1`～`-4` 依公運處 API 說明文件 V6.3 換成「還沒發車」「末班車已經過了」等說法。

### 無障礙與報讀軟體

- 不綁定特定報讀軟體，只用標準的無障礙語意，VoiceOver、TalkBack 與第三方報讀軟體都讀得到。
- 每頁一個 h1，換頁後焦點移到標題；按鈕都有可見文字；圖示一律 `aria-hidden`；DOM 順序＝視覺順序。
- 操作結果寫進同一個 live region（`role="status"`），不從 App 端呼叫原生通知（Android 已棄用 `announceForAccessibility`），避免唸兩次。
- 操作失敗時（打不開簡訊、不能撥號、拿不到位置），失敗訊息除了大字提示，也會留在按鈕下方，直到下一次操作才清掉，不會幾秒後就消失。聽不清楚模式沒有聲音，畫面上的字是唯一的提示（`src/components/elder/FailNote.tsx`，WCAG 2.2.1）。
- 按鈕配色照顧辨色能力退化的長輩：紅色只給「求助」，顏色固定跟著服務類別；按下時用粗框表示，不靠變色。用 8 種視覺條件（正常、紅色盲、綠色盲、藍黃色盲，各自再加上水晶體老化）模擬，任兩色的最小色差從提案原配色的 ΔE00 3.1 提高到 10.1。色票與計算方式見 `docs/elder-mode-spec.md` §4.1、`docs/elder-palette/check_palette.py`。
- 打開服務時會在首頁前墊一筆「選模式」的瀏覽紀錄，城市通 AppBar 的返回鍵因此一定會出現，可以回去換模式（`src/lib/elder/entry.ts`）。
- 檢查腳本：`scripts/a11y-check.js`，貼到 Chrome DevTools 的 Console 執行（App 內的 WebView 可用 `chrome://inspect` 連上）。原生機制與網頁做法的對照見 `CLAUDE.md` §4.5。

### 斷網

評審可能關掉網路測試。目前的做法與限制（`src/components/elder/OfflineSupport.tsx`）：

- 一打開服務、有網路時，就預載全部 41 個頁面（`src/lib/elder/routes.ts`），預載內容保留 1 天（`next.config.ts` 的 `staleTimes`）；同時預先下載步行路網和有聲號誌資料（`src/lib/elder/walkData.ts`）。
- 開啟 Next.js 的 `experimental.useOffline`：斷網時點到沒預載的頁面，不會跳到瀏覽器錯誤頁，網路恢復後自動重試。
- 斷網時頁首顯示「現在沒有網路。附近的據點和捷運資料暫時查不到，其他功能照常可以用」。
- 斷網後能用：首頁、找服務（打字比對）、看醫生（含設定回診、領藥提醒）、叫車（含訂不到車的退路）、帶我走到站牌（路線在手機上算；只有公車時間要網路）、我的權益、補助小幫手、家人、文字聯絡、求助卡、看診溝通卡、撥號確認頁。撥號、震動、朗讀、已排好的手機通知由 App 處理，不需要網路。
- 斷網後不能用：要讀開放資料的清單，包括附近共餐上課、視障出門、附近哪裡可以用、避難收容處所、照顧家人、疫苗篩檢院所（畫面會說「暫時讀不到」並給替代方式），以及公車時間（顯示「查不到時間」，路線名稱仍看得到）。
- ⚠️ **斷網後「重新打開」服務會打不開。** 要做到需要 Service Worker，而 iOS 的 WebView 只有在 App 宣告 App-Bound Domains 時才支援，會影響城市通裡其他服務，所以不採用。**Demo 時一定要先在有網路時打開服務，再開飛航模式。**

## 5. 主要流程

每條流程的情境、政策與 UX 依據、內容設計和參考 commit，整理在 [`docs/flow-scenarios.md`](docs/flow-scenarios.md)。

**① 開啟「用得了」**

![開啟「用得了」：點服務、WebView 載入網頁、向 App 要 userinfo 與 a11y_state、讀手機裡的設定（模式、語速、家人設定的按鈕與公車）、算年齡並篩出首頁按鈕、權益卡片與公車卡片。上方的情境手機依序演出：孫子幫金大森在台北通「我的服務」找到「用得了」，點一下後顯示「載入中…」；第一次用先到「先選一個最適合您的方式」，選「我看得到，也聽得到」時跳出大字並唸出來；最後首頁出現「午安，金大森」、重陽禮金卡片（可能可以領 3,000 元，還有 6 天截止）和大按鈕](docs/diagrams/flow-1-open.svg)

<details>
<summary>文字版</summary>

```
台北通「我的服務」→ 點「用得了」→ WebView 載入 Vercel 網址
→ bridge：userinfo（姓名、生日、行政區）、a11y_state（報讀軟體、字級）
→ 讀手機裡的設定（模式、語速、家人設定的按鈕與公車）
→ 算年齡 → 篩出首頁按鈕、權益卡片、公車卡片 → 畫面
第一次使用會先到「選模式」頁；打開時在首頁前墊一筆「選模式」紀錄（返回鍵可以回去換模式），並預載全部頁面
```

</details>

**② 按一顆大按鈕**

![按一顆大按鈕：震動，報讀軟體沒開時唸出名稱並顯示大字、開著時只顯示大字，需要時先確認，再依服務執行；成功就完成，失敗改用 fallback 並把失敗訊息留在畫面上。上方的情境手機依序演出：金大森按首頁的「1966」，手機震動、上方出現大字「1966 長照專線」並唸出來；換成看不清楚模式時大字再放大，換成聽不清楚模式時不出聲音、1999 改成「1999 文字」；接著進到「打給 1966 長照」確認頁、按「撥打 1966」；打不開時「這支手機不能撥電話」留在按鈕下方，聽不清楚模式把「線上申請長照」排在撥號前面](docs/diagrams/flow-2-press.svg)

<details>
<summary>文字版</summary>

```
點按 → 震動（haptic）
     → 報讀軟體沒開：speak 唸出名稱＋大字（role="status"）；開著：只顯示大字，報讀軟體自己會唸
     → 需要確認的動作先顯示確認頁（例如撥號）
     → 依 action 執行：phone_call／1999agree／open_link／open_external／切換頁面
     → 失敗 → 改用 fallback；聽不清楚模式先給文字管道；失敗訊息留在按鈕下方，不會 4 秒就消失
```

</details>

**③ 找服務（M2）**

![找服務：打字、點一下開始說話（listen 在手機上辨識，不支援就提示改用打字）、點分類；打字和辨識出的文字經正規化比對 services.json 的長輩說法，找到就顯示「你是說」和最多三個大按鈕，都對不上就建議打 1999。上方的情境手機依序演出：按「開始說話」後出現收音波形，說「敬老卡」被聽成「敬老咖」，仍列出敬老卡、重陽禮金；聽不清楚模式只有打字框，「釣魚」一個字一個字打出來，找不到時給「文字聯絡」；手機不能離線辨識時，訊息留在按鈕下方；也可以點「交通」分類](docs/diagrams/flow-3-find.svg)

<details>
<summary>文字版</summary>

```
打字 ──────────────────────────────┐
點一下開始說話、再點一下停止 → listen（在手機上辨識）→ 文字 ┤
              （不支援離線辨識 → 提示改用打字）            ▼
        正規化 → 比對 services.json 的 phrases → 最多三筆
        → 「你是說：…？」＋三個大按鈕
        → 都對不上 → 「要不要打 1999 問問看」
點分類 → 該分類的服務清單
```

</details>

**④ 附近據點（M9、M10、M13～M15）**

![附近據點：行政區、里或目前位置，fetch /api/opendata，白名單檢查，有快取就直接回，沒有才抓 data.taipei，再 Big5 轉碼、ODS 解析與座標換算，依距離、行政區或里篩選，回傳前幾筆給畫面顯示一句話摘要與大字電話按鈕。上方的情境手機依序演出：在看醫生頁按「附近打疫苗、做篩檢」，畫面直接寫「您住在中山區」，按「健康服務中心」後顯示「正在找中山區的健康服務中心…」，接著「中山區有 1 個健康服務中心」和大字電話按鈕；按電話先到「打給中山區健康服務中心」確認頁；讀不到時顯示「資料暫時讀不到」並建議打 1999](docs/diagrams/flow-4-places.svg)

<details>
<summary>文字版</summary>

```
userinfo.addresses[]（行政區・里）或 location
→ fetch /api/opendata/{source}?q=中山區（或 near=緯度,經度）
→ Route Handler：白名單 → 快取命中就直接回 → 否則抓 data.taipei → Big5 轉碼、ODS 解析、座標轉換
→ 依距離、行政區或里篩選，回傳前幾筆 → 一句話摘要＋大字電話按鈕（斷網或讀不到：說明並給 1999）
用到的頁面：M9 附近吃飯上課、M10 視障出門、M13 颱風地震時去哪裡（用里找負責的避難所）、M14 照顧家人、M15 打疫苗做篩檢
```

</details>

**⑤ 家人代設定（M7）**

![家人代設定：家人的手機勾選按鈕、填電話與行政區、選公車路線與站牌後產生 QR code；長輩的手機按「家人幫我設定」掃描、檢查格式後存在手機裡，全程不經過伺服器。上方的情境手機先是女兒的手機：按「我是家人，幫長輩設定」、勾首頁按鈕、稱呼「大女兒」和電話一個字一個字打出來、按「產生設定碼」出現 QR code；再換成金大森的手機：按「打給家人」→「家人幫我設定」、相機對準設定碼，最後整頁「設定好了」](docs/diagrams/flow-5-family.svg)

<details>
<summary>文字版</summary>

```
家人手機：「用得了」→「我是家人」→ 勾首頁按鈕、填電話與行政區、選公車路線與站牌（最多 2 組）
         → 產生 QR（設定內容在 QR 裡）
長輩手機：「家人幫我設定」→ qr_code_scan → 檢查格式、版本、隱藏字元 → 存在手機裡 → 唸「設定好了」
（全程不經過伺服器）
```

</details>

**⑥ 權益提醒（M6）**

![權益提醒：由台北通帳號的生日算年齡、比對資格，顯示權益卡片（最上面是很多人不知道的權益），可以線上申請匯款，或按「提醒我申請」排程手機通知。上方的情境手機依序演出：金大森按「我的權益」，畫面寫「您今年 86 歲」，最上面是「很多人不知道的權益」，再往下是重陽禮金卡片；按「提醒我申請」後顯示已設定 11 月 12 日早上 9 點提醒；當天鎖定畫面跳出「重陽禮金明天截止」；最後按「線上申請匯款」](docs/diagrams/flow-6-benefit.svg)

<details>
<summary>文字版</summary>

```
userinfo.birthday → 年齡（原住民門檻降 10 歲）→ 比對資格
→ 最上面「很多人不知道的權益」：老人健保費補助、長照交通接送、照顧家人
→ 重陽禮金卡「還沒收到重陽禮金嗎？您今年可能可以領 3,000 元。」
→ 「線上申請匯款」→ open_external 開社會局網站
→ 「提醒我申請」→ reminder（11/12 早上 9 點跳出手機通知，App 關掉也會跳）
```

</details>

**⑦ 看完醫生之後（M4）**

![看完醫生之後：在看醫生頁選回診或領藥、選日子，提醒時間是前一天晚上 7 點（來不及就改當天早上 7 點），用 reminder 排程手機通知，都來不及就說明；可以再按「傳給家人知道」。上方的情境手機依序演出：在「看完醫生之後」按「回診」、日期選 2026/11/20，畫面寫「會在 11 月 19 日（星期四）晚上 7 點跳出手機通知」，按「提醒我回診」；19 日晚上 7 點鎖定畫面跳出「明天要回診」；最後在「傳給家人知道」按「傳簡訊給大女兒」](docs/diagrams/flow-7-followup.svg)

<details>
<summary>文字版</summary>

```
看醫生頁「看完醫生之後」→ 選回診，或領慢性病連續處方箋的藥 → 選日子
→ 提醒時間：前一天晚上 7 點；剩不到 5 分鐘就改當天早上 7 點；都過了 → 說明，不排通知
→ reminder：「明天要回診」手機通知（App 關掉、斷網也會跳）
   內文只提醒要帶健保卡、藥袋、處方箋，不寫未查證的健保領藥規則
→ 「傳給家人知道」：簡訊帶好內文，不自動送出；沒設定家人就複製貼到 LINE
```

</details>

**⑧ 公車還有幾分鐘到（M16）**

![公車還有幾分鐘到：家人在幫長輩設定時用 /api/bus/routes 找路線、/api/bus/stops 選方向與站牌，連同站牌位置編進 QR 設定碼；長輩掃描後首頁出現公車卡片，畫面看得到時每 30 秒查 /api/bus/eta，顯示還有幾分鐘，按「再查一次」會唸出來；卡片上還有「帶我走到站牌」。上方的情境手機先是女兒的手機：「307」一個字一個字打出來、按「找路線」，選「307 往撫遠街」，打「三民」選「南京三民路口」，按「產生設定碼」出現 QR code；再換成金大森的手機：掃描後首頁出現公車卡片，從「正在查…」變成「還有 7 分鐘」，按「再查一次」後變成「快到了」並唸出來](docs/diagrams/flow-8-bus.svg)

<details>
<summary>文字版</summary>

```
家人手機：「我是家人」→ 輸入路線名稱（/api/bus/routes）→ 選方向、站牌（/api/bus/stops）
         → 最多 2 組，臺北、新北都可以 → 編進設定碼（路線、站牌代號與站牌位置）
長輩手機：掃 QR → 首頁出現公車卡片
         → 畫面看得到時每 30 秒查 /api/bus/eta →「307 往撫遠街・南京三民路口，還有 7 分鐘」
         → 按「再查一次」會唸出來；斷網時顯示「查不到時間」（路線名稱仍看得到）
         → 「帶我走到站牌」：見 ⑨
```

</details>

**⑨ 帶我走到站牌（M16 延伸，`/walk`）**

![帶我走到站牌：從首頁公車卡片進入，取得現在位置，在手機上用 A* 和 OSM 路網算步行路線，比較走路和公車到站時間（趕不上就說等下一班）；走路時轉彎、過馬路前 40 公尺先提醒，過馬路處有有聲號誌就提醒聽嗶嗶聲，偏離超過 35 公尺就重新找路。上方的情境手機依序演出：首頁公車卡片（中山幹線 往青年公園・三玉宮，還有 9 分鐘）按「帶我走到站牌」，顯示「正在找您現在的位置…」「正在找路…」，接著唸出「走到站牌大約 6 分鐘，公車還有 9 分鐘，來得及，慢慢走就好」；按「開始帶我走」後依序提醒「直走 40 公尺，右轉進入天母東路」「現在右轉」「這裡有有聲號誌，聽到嗶嗶聲再走」「好像走偏了，重新找路」，最後「到了，站牌就在附近」](docs/diagrams/flow-9-walk.svg)

<details>
<summary>文字版</summary>

```
家人設定公車時，站牌位置（showLat／showLon）一起存進設定碼 → 長輩斷網也知道站牌在哪
長輩首頁公車卡片 →「帶我走到站牌」→ 用台北通 location 取得現在位置（走路時用 WebView watchPosition）
  → 在手機上用 A* 算步行路線（OSM 路網 public/walk/tianmu.json，樓梯成本加重）
  → 摘要：「走到站牌大約 6 分鐘，公車還有 9 分鐘，來得及，慢慢走就好」（趕不上就說等下一班，不叫長輩用跑的）
  → 轉彎、過馬路前 40 公尺先提醒，到了說「現在右轉」並震動（speak、haptic）
  → 過馬路的地方 30 公尺內有有聲號誌（M10 的資料）就說「聽到嗶嗶聲再走」
  → 偏離路線超過 35 公尺（連續 2 次）就重新找路
「模擬走一次」：位置沿路線自動前進（約長輩步行的 5 倍速），桌上測試、決選舞台用
```

</details>

限制：路網只涵蓋會場周邊（天母、芝山、明德）；範圍外會說明並給直線距離。長輩步行速度用 0.8 公尺／秒估算（保守值，**未查證出處**，不可寫成研究數據）。螢幕關掉時 WebView 會暫停，畫面提醒長輩螢幕不要關。路線只是參考，OSM 的斑馬線資料不一定完整，畫面上寫「過馬路一定要看號誌、走斑馬線」。

### 決策流程

**M5 我要叫車：最多兩題分流，訂不到車也有下一步**

![M5 叫車分流：有身障證明→復康巴士；沒有或不知道→問長照 2 級以上嗎？是→長照交通接送，不是→敬老愛心計程車，不知道→先問 1966 並列出敬老計程車；每個結果都有「訂不到車怎麼辦？」，依序退到長照交通接送、敬老計程車、打給家人。上方的情境手機依序演出：金大森按「叫車」，第 1 題答「沒有」、第 2 題答「不知道」，結果是「先打 1966 問長照等級」並列出敬老計程車；按「撥 55850」先到確認頁；往下是「訂不到車怎麼辦？」的打給家人；聽不清楚模式把「線上申請長照」排前面，敬老計程車標明只能用講的，另外給「手語視訊轉譯」](docs/diagrams/m5-ride.svg)

<details>
<summary>文字版</summary>

```
有身心障礙證明嗎？
├ 有 → 復康巴士：預約網站・電話訂車（8:00–17:00 受理）
└ 沒有、不知道 → 家裡申請過長照，2 級以上嗎？
    ├ 是 → 長照交通接送（每月給付上限 1,680 元）
    ├ 不是 → 敬老愛心計程車：撥 55850，接通後按 0；每趟最多扣 85 點
    └ 不知道 → 先問 1966，也先列出敬老計程車
訂不到車怎麼辦？（每個結果都有，從自己的下一格開始往下退）
    復康巴士 → 長照交通接送（沒回答過長照「不是／不知道」才列）→ 敬老計程車 → 打給家人
聽不清楚模式：結果或退路有敬老計程車（只能打電話）時，另外給「手語視訊轉譯」
```

</details>

復康巴士只限持身障證明的人搭乘，很多長輩以為能叫，所以提案原本的「叫復康巴士」按鈕改成「我要叫車」，先分流。

**M12 補助小幫手：先問幫誰看，再問三題**

![M12 補助小幫手：先問幫誰看；幫自己就自動帶入年齡、原住民身分、行政區，幫家人就問年紀級距（55～64 歲才問是不是原住民）；再問三題（身障證明、家裡收入、需要照顧），結果分成可能可以申請、不用申請會自動入帳、答不知道的提示三塊，每張卡片附打電話時的第一句話，最後固定給 1957、1966、文字聯絡。上方的情境手機依序演出：先問「您是幫誰看？」按「幫我自己」，帶入「86 歲・中山區」，三題依序答「沒有」「沒有，但收入不高」「不需要」，結果「您可能可以申請 4 項」第一張是老人生活津貼；卡片裡寫好打電話時的第一句話，按「打給中山區公所社會課」；最後是「沒有找到適合的，或還是不確定？」和 1957 福利](docs/diagrams/m12-subsidy.svg)

<details>
<summary>文字版</summary>

```
您是幫誰看？
├ 幫我自己 → 自動帶入（不用問）：年齡、原住民身分（門檻降 10 歲）、行政區 ← 台北通帳號
└ 幫另一半或家人 → 他（她）今年幾歲？未滿 55 歲／55～64 歲／65 歲以上／不知道
                  → 選 55～64 歲才問：是原住民嗎？（級距會影響結果時才問）
                  → 行政區、市民身分沿用您的（當作住同一戶）
→ 三題大按鈕，都有「不知道」（幫家人時主詞改成「他（她）」）：
   1. 有身心障礙證明嗎？（有 → 看不清楚／聽不清楚／其他）
   2. 家裡收入：有低收或中低收證明／沒有，但收入不高／不知道
   3. 家裡有人需要別人照顧嗎？
→ 結果分三塊：您可能可以申請／不用申請，會自動入帳或減免／答「不知道」的提示
→ 每張卡片：一句話＋大約金額、要準備什麼、戶籍地社會課、打電話時的第一句話、家人能不能代辦、
   申請準備單（可以傳給家人）
→ 最後固定一段「沒有找到適合的，或還是不確定？」：1957、1966、文字聯絡；一筆都沒有時，這一段移到最前面
```

</details>

只說「可能可以申請」，不說「符合」，最後由社會局審核；答案只存在手機裡，不上傳。

## 6. 設計取捨

開發前的規劃書有幾處和研究、實測結果衝突，以研究結果為準改掉：

| 原本的想法 | 問題 | 改成 |
|---|---|---|
| 語音辨識用 whisper.cpp（WebAssembly） | Android WebView 不支援 `SharedArrayBuffer`，多執行緒 WASM 跑不了；模型 57 MB、執行時約需 388 MB 記憶體 | App 端 `listen` Handler，用手機系統的裝置端辨識 |
| 朗讀用瀏覽器的 `speechSynthesis` | Android WebView 不支援 | App 端 `speak` Handler（flutter_tts） |
| 字級「跟隨系統放大」 | 城市通的 WebView 把字級固定在 100%，iOS 也不跟隨系統 | `a11y_state.textScale` 加上全站 `rem` |
| 按住說話、放開送出 | VoiceOver 使用者很難按住不放 | 點一下開始、再點一下結束，並一定有打字 |
| 每顆按鈕都能「退回撥電話」 | 聽障者打不了電話 | `fallback` 之外，再加 `alt_channels` 文字管道 |
| 首頁放「叫復康巴士」 | 復康巴士只限持身障證明者 | 「我要叫車」加分流（M5） |
| 地圖用 flutter_map | 微服務是網頁 | 用一句話說出位置，必要時再用 Leaflet＋OpenStreetMap |
| 每日報平安（沒按就通知家人） | 需要伺服器或簡訊，也有通報責任問題 | 列為下一階段 |

**不採用的技術**：網頁的 Web Speech API 辨識（Chrome 預設送到雲端辨識，違反執行時不呼叫雲端的規則）、sherpa-onnx（由小米的 k2-fsa 團隊開發，和「不使用大陸廠牌」的原則不符）、Service Worker 離線快取（見上方「斷網」）。

## 7. 執行方式

### Repo 結構

網頁、App、文件都在這個 repo：

| 位置 | 內容 | 授權 |
|---|---|---|
| 根目錄（`src/`、`package.json`…） | 「用得了」微服務網頁（Next.js，前端＋後端 Route Handlers）。Vercel 從根目錄部署 | AGPL-3.0 |
| [`townpass/`](townpass/) | 修改過的城市通 App（fork 自 [taipei-doit/TownPass](https://github.com/taipei-doit/TownPass)，保留完整 git 歷史） | GPL-3.0 |
| [`docs/`](docs/) | 規格、研究、開放資料、設計系統、架構圖與流程圖 | — |

> 文件裡 App 端的路徑（`lib/`、`assets/`、`ios/`、`android/`、`test/`、`pubspec.yaml`）都相對於 `townpass/`；網頁端的路徑都以 `src/` 開頭。

### 網頁（根目錄）

需求：Node.js 24 以上。

```bash
npm ci
cp .env.example .env.local   # 目前用到的資料來源都不需要金鑰
npm run dev                  # http://localhost:3000（一般瀏覽器會自動使用 mock 資料）
npm test                     # 單元測試（node --test）
npm run lint
npx tsc --noEmit
npm run build
```

### 城市通 App（`townpass/`）

需求：[FVM](https://fvm.app/documentation/getting-started/installation)（或 Flutter 3.47.6）、Xcode（iOS 最低 15）、Android SDK（Java 17）。官方開發文件見 [Town Pass guideline](https://tpe-guideline.web.app/en/docs/)。

```bash
cd townpass
fvm install                                                   # 依 .fvmrc 安裝 Flutter 3.47.6
fvm flutter pub get
fvm dart run build_runner build --delete-conflicting-outputs  # 產生 lib/gen/*.gen.dart
fvm flutter run                                               # 模擬器或實機
fvm flutter analyze && fvm flutter test
```

沒有 FVM 的話，把指令開頭的 `fvm` 拿掉，並確認 `flutter --version` 是 3.47.6。

### 在城市通 App 內測試網頁

1. 網頁要部署到 HTTPS 網址（App 的 WebView 無法開啟 http），或用 ngrok 對外提供本機服務
2. 新網域要加進 `townpass/lib/util/elder_mode_config.dart` 的 `trustedHosts`，否則 `listen` 會回 `forbidden`
3. 本服務已在 `townpass/lib/page/city_service/model/my_service_model.dart` 登記並預設置頂；`fvm flutter run` 後到「服務」頁開啟「用得了」
4. 開發用測試頁在 `/dev`，可以逐一測試新增的 Handler。語音辨識請開飛航模式再測一次

### 評審試用路徑（約 2 分鐘）

> [!TIP]
> 最快的看法：照下面 6 步走一次，就能看到「依需求找服務」「三種模式」「家人代設定」「斷網」四個重點。

測試帳號在 `townpass/assets/mock_data/account.json`（生日 1940/03/01，86 歲，示範重陽禮金 3,000 元級距）。

1. 台北通 →「服務」→「用得了」。首頁顯示「午安，金大森」和「重陽禮金 3,000 元，還有 6 天截止」。
2. 按首頁的「看醫生」→ 聯醫掛號、叫車、1966 三個大按鈕一次列出，跨三個機關。（用「說話或打字找服務」輸入「我要去看醫生」，會直接找到聯醫掛號）
3. 按「叫車」→「有身障證明嗎？沒有」→「長照 2 級以上嗎？不是」→ 敬老計程車，並說明復康巴士只限身障者。
4. 回首頁按「換模式」，改成「我聽不清楚」：同一個首頁，1999 變成「1999 文字」，撥號旁都有「用文字」；按底部的「求助」，可以看到全螢幕求助卡和 119 簡訊範本（不會自動送出）。
5. 「家人」→ 用另一支手機在「我是家人」產生 QR code，長輩的手機一掃，首頁按鈕就換好。
6. 開飛航模式：打字找服務、各頁切換、撥號確認都還能用。

> [!IMPORTANT]
> 要先在有網路時打開服務，再開飛航模式（見「斷網」）。

> [!WARNING]
> Demo 不會送出真實求救：119、110 只顯示簡訊範本，要使用者自己按送出。

### 部署

**Vercel**（目前使用）：匯入本 repo 即可，Root Directory 維持根目錄（不要設成 `townpass/`）。Function 區域設定在 `vercel.json`（`hnd1` 東京）。

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

## 8. 資料來源

授權：政府資料開放授權條款第 1 版。代理目前登記的全部來源可用 `GET /api/opendata` 查詢；下表列出本服務使用的資料集。

| 資料集 | 提供機關 | 連結 | 用途 | 狀態 |
|---|---|---|---|---|
| 老人共餐單位一覽表 | 社會局 | [fe55795c…](https://data.taipei/dataset/detail?id=fe55795c-a220-4b88-bde1-5b994321f8af) | M9 附近共餐 | 使用中 |
| 社區照顧關懷據點 | 社會局 | [d082dc87…](https://data.taipei/dataset/detail?id=d082dc87-d3fd-479d-89c6-745ff1be955a) | M9 | 使用中 |
| 長青學苑 | 社會局 | [67b63404…](https://data.taipei/dataset/detail?id=67b63404-89b8-4214-8096-3322204144e6) | M9 | 使用中 |
| 樂齡學習據點 | 教育局 | [ca59e66b…](https://data.taipei/dataset/detail?id=ca59e66b-7200-4283-8c32-08bde2f5f142) | M9（樂齡學堂＋樂齡學習中心） | 使用中 |
| 臺北捷運車站無障礙設施資料 | 捷運公司 | [3c799405…](https://data.taipei/dataset/detail?id=3c799405-4e44-40dd-b747-daed09e88cdb) | M10 視障出門 | 使用中 |
| 臺北捷運車站出入口無障礙電梯、坡道座標 | 捷運公司 | [0a3bb422…](https://data.taipei/dataset/detail?id=0a3bb422-9eb5-459b-a9d4-138456516183) | M10、M17 捷運電梯 | 使用中 |
| 交工處無障礙設施設置資料（有聲號誌） | 交通局 | [baf32b58…](https://data.taipei/dataset/detail?id=baf32b58-b194-448d-96a0-ba04013d164f) | M10 | 使用中 |
| 臺北捷運車站無障礙設施異常公告 | 捷運公司 | [d884a9c6…](https://data.taipei/dataset/detail?id=d884a9c6-f86c-4854-8da7-e6516ddbe612) | M10 | 使用中 |
| 臺北市老人服務中心 | 社會局 | [78dfc9a2…](https://data.taipei/dataset/detail?id=78dfc9a2-36e2-4ef5-beaa-a74633ba3d26) | M9 附近吃飯、上課 | 使用中 |
| 臺北市預估到站時間(公車)、新北市預估到站時間 | 交通局公運處 | [f11a5af0…](https://data.taipei/dataset/detail?id=f11a5af0-7b37-48ef-98cc-f6f102ed43c6)、[1e26ecf6…](https://data.taipei/dataset/detail?id=1e26ecf6-d5b4-494b-b94f-bee64938dd64) | M16 公車幾分鐘到 | 使用中 |
| 臺北市路線、新北市路線 | 交通局公運處 | [6a03b03d…](https://data.taipei/dataset/detail?id=6a03b03d-90d1-4d9e-a952-c940fd869772)、[1f5998d2…](https://data.taipei/dataset/detail?id=1f5998d2-d9e4-4d9f-8cbb-fe2d29b99c3c) | M16 找路線 | 使用中 |
| 臺北市站牌、新北市站牌 | 交通局公運處 | [62bc76da…](https://data.taipei/dataset/detail?id=62bc76da-6e6b-46ee-8976-c1945092d504)、[010244b7…](https://data.taipei/dataset/detail?id=010244b7-c4ed-4b03-9436-c6cbe634d483) | M16 選站牌；站牌位置（`showLat`／`showLon`）給「帶我走到站牌」 | 使用中 |
| 臺北市可供避難收容處所一覽表 | 教育局 | [aaf97773…](https://data.taipei/dataset/detail?id=aaf97773-3631-40e2-b3cc-da87bf2ce1d5) | M13 避難所（.ods，419 處；不傳個人姓名與電話） | 使用中 |
| 臺北市失智症篩檢、確診評估及關懷服務計畫合約醫院 | 衛生局 | [1417e9ae…](https://data.taipei/dataset/detail?id=1417e9ae-4c86-4f74-88a2-d7031712db44) | M14 失智篩檢（全市 11 家） | 使用中 |
| 臺北市長照喘息服務特約單位 | 衛生局 | [959c34b2…](https://data.taipei/dataset/detail?id=959c34b2-9698-4d99-8987-d389efe18c04) | M14 喘息服務（巷弄式、社區式、居家式） | 使用中 |
| 臺北市銀髮族服務_家庭照顧者服務中心 | 社會局 | [e3cec007…](https://data.taipei/dataset/detail?id=e3cec007-4212-4944-989e-5078e4f5f3bb) | M14 照顧者支持 | 使用中 |
| 臺北市健康服務中心 | 衛生局 | [d4c6d4e0…](https://data.taipei/dataset/detail?id=d4c6d4e0-c2b4-48e3-99b4-f670d820326b) | M14、M15 | 使用中 |
| 臺北市流感疫苗合約醫療院所(成人) | 衛生局 | [0db13d34…](https://data.taipei/dataset/detail?id=0db13d34-51e3-497a-a023-286d5ef692ea) | M15 流感疫苗 | 使用中 |
| 臺北市公費肺炎鏈球菌疫苗合約醫療院所名單 | 衛生局 | [92934ab2…](https://data.taipei/dataset/detail?id=92934ab2-3509-4a6b-9cee-9ac556ca2f65) | M15 肺炎鏈球菌疫苗 | 使用中 |
| 臺北市五癌篩檢醫療院所 | 衛生局 | [ae20d75c…](https://data.taipei/dataset/detail?id=ae20d75c-dffb-4d4f-85e1-9c512189005c) | M15 癌症篩檢 | 使用中 |
| 臺北市假牙補助醫療院所名單 | 社會局 | [76b8b514…](https://data.taipei/dataset/detail?id=76b8b514-e793-4cca-8dcf-065d5af4b760) | M15、M12 假牙補助 | 使用中 |
| 臺北市公廁點位資訊 | 環保局 | [ca205b54…](https://data.taipei/dataset/detail?id=ca205b54-a06f-4d84-894c-d6ab5079ce79) | M17 無障礙廁所（只列「無障礙廁座數」大於 0 的公廁） | 使用中 |
| 臺北市親子友善廁所點位資訊 | 環保局 | [9d7488f5…](https://data.taipei/dataset/detail?id=9d7488f5-0f19-45c3-adf9-badf686dda18) | M17 親子廁所 | 使用中 |
| 臺北市哺集乳室 | 衛生局 | [5d1d34d8…](https://data.taipei/dataset/detail?id=5d1d34d8-1b81-4162-87b6-05e0896af958) | M17 哺集乳室（沒有座標，依地址的行政區列出） | 使用中 |
| 臺北市AED自動體外心臟去顫器設置地點 | 衛生局 | [cd050577…](https://data.taipei/dataset/detail?id=cd050577-115f-4299-b37a-012ff490a632) | M17 AED | 使用中 |

**步行路網（M16「帶我走到站牌」）**：[OpenStreetMap](https://www.openstreetmap.org/) 的道路與人行道，© OpenStreetMap contributors，授權 [ODbL 1.0](https://opendatacommons.org/licenses/odbl/1-0/)（不是政府資料開放授權條款）。開發時用 `scripts/build-walk-graph.ts` 從 Overpass API 下載會場周邊（北緯 25.100～25.122、東經 121.515～121.540）一次，轉成 `public/walk/tianmu.json`；執行時不呼叫任何路線規劃服務，路線在手機上算。畫面上有標註出處。

服務清單（M3）裡的電話、網址、補助資格與金額，是隊員從市府官網整理後寫入的，每筆都附 `source` 與 `verified`（查證日期）。

聽障者求助相關（M8）：
- 119 簡訊範本照[臺北市政府消防局宣導單](https://www-ws.gov.taipei/001/Upload/691/relfile/61747/8937655/b275fc3e-70f8-4e5b-83da-f7fdb9a77e18.pdf)的官方格式。
- 119／110 簡訊報案號碼：消防署開放資料 [data.gov.tw/dataset/7917](https://data.gov.tw/dataset/7917)、警政署 [data.gov.tw/dataset/7916](https://data.gov.tw/dataset/7916)。**119 簡訊號碼在官方來源中有兩個版本，畫面上兩個都列並標示待確認。**
- 求助卡、看診溝通卡的文字是隊員預先寫好的固定內容，不是 AI 產生。

防詐先問一下（M11）：
- 詐騙手法、關鍵字與提醒文字取自[內政部警政署 165 全民防騙網](https://165.npa.gov.tw/)的官方文章（假檢警、解除分期付款、假中獎、假投資、猜猜我是誰、騙帳號密碼），每筆在 `src/data/antifraud.json` 附原文網址與查證日期；查證紀錄見 `docs/antifraud-research.md`。比對規則是隊員預先寫好的關鍵字，不是 AI 產生。
- 165 LINE 官方帳號 `@tw165`：165 打詐儀錶板（刑事警察局）首頁的連結；官方說明的功能是查網址有沒有被通報。

> 核心資料使用合法開放資料；如有模擬資料會在此標示。

## 9. 第三方套件

**本 repo（微服務網頁）**

| 套件 | 授權 |
|---|---|
| next | MIT |
| react、react-dom | MIT |
| tailwindcss、@tailwindcss/turbopack | MIT |
| typescript | Apache-2.0 |
| eslint、eslint-config-next | MIT |
| qrcode 1.5.4（M7 家人代設定產生 QR code） | MIT |
| @types/qrcode | MIT |

**城市通 App（`townpass/`）新增的 Flutter 套件**

| 套件 | 授權 | 用途 |
|---|---|---|
| flutter_tts 4.2.5 | MIT | `speak` |
| speech_to_text 7.5.0 | BSD-3-Clause | `listen` |
| timezone 0.11.1 | BSD-2-Clause | `reminder`（原本就是 flutter_local_notifications 的間接依賴，改為直接引用） |

## 10. AI 使用聲明

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

## 11. 評估面向對照

| 面向 | 本作品的做法 |
|---|---|
| 安全（個資保護、防攻擊、能被監督） | 語音只在手機裡辨識；補助篩選的答案、回診和領藥提醒只存在手機；家人設定用 QR code 直接傳遞，「傳給家人知道」只打開手機的簡訊 App，都不經過伺服器；手機的位置座標只在手機上計算最近的捷運站與號誌、算步行路線，避難所也是整份資料抓回手機再用里篩選。送到本服務後端的只有資料集名稱、行政區名稱、公車路線與站牌代號（不含姓名、生日、座標、里別），Vercel 的請求紀錄可能留下這些查詢參數；「原始碼與授權」連結讓任何人都能檢查。麥克風只開放本服務網域；`open_external` 只允許 4 種 scheme；開放資料代理與公車資料都採白名單 |
| 創新（新想法、能持續改） | 一個入口照顧三類人（模式只改變行為、不改內容）；服務清單是開源 JSON，局處可以自行補「長輩的說法」；補助小幫手可以幫另一半或家人看，年紀只問大概的範圍；「帶我走到站牌」不呼叫路線規劃服務，用開放的 OSM 路網在手機上算路線 |
| 有感（解決需求、可擴充） | 依需求而不是機關找服務；一按就撥號或開官方頁面；主動告訴長輩「你有這個權益」；每條路都有下一步：訂不到車依序換車種、最後打給家人，找不到補助就給 1957、1966、文字聯絡；看完醫生可以設回診、領藥提醒；用語音和震動帶長輩走到公車站牌，趕不上就說等下一班，不叫長輩用跑的 |
| 參與（方便表達意見、參與社區） | 附近共餐、關懷據點、長青學苑、樂齡學習、老人服務中心；家人與里辦志工可以用 QR code 協助設定首頁按鈕與公車站牌；回診時間、申請準備單、求助都可以「傳給家人知道」 |
| 便利（數位歸戶、無縫接軌、主動推薦） | 用 `userinfo` 的生日、行政區與里自動判斷資格，帶出同區據點與負責的避難收容處所；權益頁最上面主動推薦很多人不知道的權益；首頁直接看公車還有幾分鐘到 |
| 透明（用語淺白、即時更新、指引清楚） | 每筆服務標示主責機關、官方連結與查證日期；每個開放資料清單都附資料集名稱與連結；補助只說「可能可以申請」，最後由社會局審核；回診提醒只寫要帶的東西，不寫未查證的健保規則；已知限制寫在「維運說明」 |

## 12. 維運說明

- **資料由誰更新**：開放資料由各局處在 data.taipei 更新，代理即時抓取。服務清單（電話、網址、補助資格）是一份 JSON，規劃由各局處自行維護；每筆都有查證日期，方便定期檢查。
- **問題由誰處理**：得獎後協助資訊局整併；程式架構與測試說明見本 README 與 `docs/`。

### 資訊局整併清單

App 端相對 [taipei-doit/TownPass](https://github.com/taipei-doit/TownPass) main（2026/10）只**新增**，不改既有流程。整併時照下表合併即可（`git diff` 的比較基準是 `townpass/` 併入前的上游 commit `e65b586`）：

| 項目 | 位置（相對 `townpass/`） | 內容 |
|---|---|---|
| 6 個新 Handler | `lib/util/web_message_handler/elder_mode_message_handlers.dart`、`elder_mode_platform.dart` | `speak`、`a11y_state`、`haptic`、`open_external`、`listen`、`reminder`（規格見上方「新增的 App Handler」）；名稱不和內建 9 個重複 |
| 登記 Handler | `lib/util/web_message_handler/tp_web_message_listener.dart` | 在 `_cachedMessageHandlers` 加 6 行 |
| 只開放給本服務的能力 | `lib/util/elder_mode_config.dart` | `listen`（麥克風）、`reminder` 只接受 `trustedHosts` 裡的 https 網域；換正式網域時改這裡 |
| 服務卡片與預設置頂 | `lib/page/city_service/model/my_service_model.dart`、`widget/pinned_service_widget_controller.dart`、`assets/svg/icon_accessibility.svg` | 「用得了」卡片、專屬圖示 |
| 套件 | `pubspec.yaml` | flutter_tts（MIT）、speech_to_text（BSD-3-Clause）、timezone（BSD-2-Clause）；flutter_local_notifications 原本就有 |
| iOS 權限 | `ios/Runner/Info.plist` | 麥克風、語音辨識的用途說明；`LSApplicationQueriesSchemes` 加 sms、tel、line |
| Android 權限 | `android/app/src/main/AndroidManifest.xml`、`MainActivity.kt` | 正式版的 INTERNET、RECORD_AUDIO、RECEIVE_BOOT_COMPLETED；排程通知的 2 個 receiver；`<queries>` 加簡訊、https、TTS、語音辨識；`MainActivity` 加一個確認「裝置端辨識可用」的 MethodChannel（不可用就不辨識，不會退回雲端） |
| 測試 | `test/elder_mode/` | Handler 與網域白名單的單元測試 |

網頁端是獨立的 Next.js 專案，附 `Dockerfile`，可以搬到市府自己的主機；搬家後把新網域加進 `elder_mode_config.dart` 的 `trustedHosts`，並更新 `my_service_model.dart` 裡的網址。

### 已知限制與待確認

| 項目 | 目前的處理 |
|---|---|
| 119 簡訊號碼在官方來源中有兩個版本 | 畫面上兩個都列並標示待確認；正式上線前要向臺北市消防局確認 |
| 尚未用實機開 VoiceOver／TalkBack 完整實測 | 已用瀏覽器在三種模式下檢查報讀；決選前要實機測 |
| 斷網後重新打開服務會打不開 | iOS WebView 的 Service Worker 限制，見「斷網」 |
| 敬老卡餘額、看診進度、訂車狀態沒有開放 API | 第一版引導打 1999；需要市府介接 |
| 〈失智症篩檢合約醫院〉資料集左右兩份清單並排、同一列沒有對應 | 只當全市 11 家醫院的清單用，不說「負責您這一區」；行政區用醫院地址判斷 |
| 避難收容處所實際開設哪幾處，要看災害當時市府的公告 | 畫面寫明「請以市政府當時的公告為準」 |
| 假牙補助能不能由家人代辦，官方沒寫；1999 分機在不同官方頁面互相矛盾 | 代辦寫「請先打電話問」；分機用社會局洽辦資訊頁的 1576（`taipei-subsidies.md` A.12） |
| 公車時間一定要連網才查得到；站牌裁撤後站牌代碼會消失 | 斷網時顯示「查不到時間」並說明（路線名稱存在設定碼裡，仍看得到）；查不到時請家人重新設定 |
| 晚上或假日常是「末班車已經過了」「今天沒有開」 | 照官方特殊值說明；Demo 避開深夜 |
| 「帶我走到站牌」的路網只涵蓋會場周邊（天母、芝山、明德） | 範圍外會說明並給直線距離；要擴大範圍時重跑 `scripts/build-walk-graph.ts` |
| 長輩步行速度用 0.8 公尺／秒估算 | 保守值，**未查證出處**，只用來判斷「來不來得及」，不當成研究數據 |
| 步行導航時螢幕關掉，WebView 會暫停 | 畫面提醒長輩螢幕不要關 |
| OSM 的斑馬線資料不一定完整 | 路線只是參考，畫面寫「過馬路一定要看號誌、走斑馬線」 |
| 手語翻譯的承辦單位委託到 2026-12-31 | 服務清單的 `verified` 日期會顯示在畫面上，到期要重新查證 |
| 系統的裝置端語音辨識是否算「裝置端模型推論」 | 已依規則確保不送雲端（見「AI 使用聲明」）；如主辦認定不符，關掉語音、保留打字和點選即可 |
| 「附近哪裡可以用」的哺集乳室資料沒有座標 | 依地址的行政區列出（約 2% 資料的行政區代碼和地址不同區，以地址為準）；其他 4 類用目前位置找 1.5 公里內最近的 3 個 |
| 公廁、哺集乳室實際開放時間與能不能用，資料不一定即時 | 畫面寫「實際開放情形以現場為準」，並附資料集名稱與連結 |

## 授權

本專案以 [GNU AGPL-3.0-or-later](LICENSE) 授權（SPDX：`AGPL-3.0-or-later`）。修改後的城市通 App（[`townpass/`](townpass/)）沿用原專案的 GPL-3.0（[`townpass/LICENSE`](townpass/LICENSE)）；GPLv3 第 13 條允許它和 AGPL-3.0 的程式放在同一個 repo。

依《競賽須知》（115.08.27 版）捌、一、(二)，載明主辦指定的 AGPL 授權條款（`< >` 欄位依 GNU 慣例填入程式名稱、年份、作者，其餘照抄原文）：

```text
用得了（台北通長輩模式）：在台北通裡，讓長輩、視障者、聽障者都用得了市府服務的微服務。
Copyright (C) 2026 AI城市起風 × 奇鋒國際 PEAKQI
This program is free software: you can redistribute it and/or modify it under the terms of the GNU Affero General Public License as published by the Free Software Foundation,either version 3 of the License, or (at your option) any later version.
This program is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU Affero General Public License for more details. You should have received a copy of the GNU Affero General Public License along with this program. If not, see < https://www.gnu.org/licenses/>.
```

- **原始碼取得**（AGPL 第 13 條）：服務的「選模式」頁最下方有「原始碼與授權」連結，指向本 repo。
- **不屬於 AGPL 範圍的資料**：`src/data/antifraud.json`、`src/data/services.json` 裡引用的官方文字與開放資料，依各機關的「政府資料開放授權條款－第 1 版」或政府網站資料開放宣告使用，出處見「資料來源」。
- 得獎公布後，本 repo 依須知捌、一、(一) 保持公開至少一年。

---

<p align="center"><sub>
  <b>參賽：<a href="https://codefest.taipei/2026-fall/">2026 臺北秋季程式設計節－城市通微服務大黑客松</a></b><br>
  競賽期間 2026-11-07（六）～11-08（日）・臺北市立大學天母校區體育館<br>
  主辦單位：臺北市政府資訊局<br>
  感謝單位（依官網）：國立清華大學科技藝術研究所、輔仁大學資訊管理學系、台灣數位遊牧者協會、開放文化基金會（OpenCulture Foundation）、國立臺北科技大學資訊與財金管理系、中原大學資訊管理學系、元智大學資訊管理學系<br>
  參賽隊伍：AI城市起風 × 奇鋒國際 PEAKQI
</sub></p>
