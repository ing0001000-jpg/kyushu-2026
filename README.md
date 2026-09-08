# 九州旅遊助手 2026/09/27–10/05

**已上線：https://ing0001000-jpg.github.io/kyushu-2026/**

手機用 Safari／Chrome 開上面的網址 →「加入主畫面」，桌面會出現⛩️圖示，點開是全螢幕、沒有網址列，離線也能用。

給 6 人九州自駕團用的手機 App。純 HTML／CSS／JS，**沒有任何外部依賴**（不載入 CDN、不載入網路字型），所以在日本沒訊號時也能用。

## 五個分頁

| 分頁 | 內容 |
|---|---|
| 今天 | 出發前：倒數 ＋ 待辦／打包進度。旅途中：當天大卡片、時間軸、今晚住宿、該區美食。結束後：全程回顧。 |
| 行程 | 9 天列表 → 單日詳情，每個地點一顆 Google Maps 導航鈕 |
| 打包 | 6 大類 41 項，勾選狀態存在瀏覽器裡 |
| 指南 | 8 個地區的美食／景點、日本自駕、溫泉禮儀、免稅、天氣穿搭、緊急聯絡、常用日文 |
| 資訊 | 4 段航班、租車取還、6 筆訂房（含地址電話）、費用總表、日幣換算 |

## 部署

已部署在 GitHub Pages（公開 repo，這是免費帳號開 Pages 的唯一方式）。已加 `robots.txt` 與 `noindex` meta 擋搜尋引擎收錄，但 repo 本身在 GitHub 個人頁面上是看得到的 — 網址別貼到公開社群。

改完內容後重新上線：

```bash
cd "/Users/shelby/AI開發專案/旅遊助手APP" && git add -A && git commit -m "更新行程" && git push
```

推上去後約 1 分鐘生效。**記得同時把 `sw.js` 裡的 `CACHE` 版本號 +1**，否則團員手機上的舊快取不會更新。

## 怎麼跑（本機開發）

```bash
cd "/Users/shelby/AI開發專案/旅遊助手APP" && python3 -m http.server 8391
```

然後瀏覽器開 `http://localhost:8391`。手機要連同一個 Wi-Fi 的話，把 `localhost` 換成電腦的區網 IP。

## 兩種版本

**1. 專案版（`index.html`）** — 完整 PWA。用 http/https 開啟時會註冊 Service Worker，把全部檔案 precache 起來，之後真正離線也能開。放到任何靜態主機（Netlify、Vercel、GitHub Pages）都可以直接用。

**2. 單檔版（`dist/kyushu.html`）** — 所有 CSS／JS／資料／圖示 inline 成一個檔案。

```bash
node tools/build-single.js
```

單檔版沒有 Service Worker（Artifact 平台的外層 `<head>` 由平台產生，無法註冊 SW），是「載入後靠瀏覽器快取」的準離線。功能與「加入主畫面」都正常。

> Service Worker 的註冊只在真實瀏覽器裡有效，開發用的內嵌瀏覽器會擋掉 SW 腳本抓取。要驗證離線，請用 Safari／Chrome 開專案版，載入一次後開飛航模式重整。

## 加到手機主畫面

- **iPhone**：Safari 開連結 → 分享 → 加入主畫面
- **Android**：Chrome 開連結 → 選單 → 安裝應用程式／加到主畫面

## 改內容

所有內容都在 `data/`，改完重整就生效（改單檔版要重跑 `node tools/build-single.js`）：

- `data/trip.js` — 9 天行程、航班、租車、住宿、費用。`map` 欄位放日文地名，導航鈕用 Google Maps 搜尋 URL 帶入，所以不需要經緯度。
- `data/guide.js` — 地區美食景點、實用資訊、日文短句
- `data/packing.js` — 打包清單（`window.PACKING`）與行前待辦（`window.TODOS`）
- `data/art.js` — 手繪 SVG 插畫（8 個地區場景 + 線性圖示）。場景用 `--reg` / `--reg-shade` / `--reg-tint` 三個 CSS 變數上色，所以自動跟著地區色相與深淺色主題走；地區色相定義在 `app.css` 的 `[data-reg="…"]{--rb:…}`。

**注意**：打包清單的勾選狀態用 `群組id:項目id` 當 key 存在 localStorage。改文字沒關係，但改 `id` 會讓已勾選的項目變回未勾選。

改版後記得把 `sw.js` 裡的 `CACHE` 版本號 +1，否則使用者的舊快取不會更新。

## 其他

- `tools/make-icons.js` — 用 Node 內建 zlib 產生鳥居圖示 PNG，不需要 `npm install`
- 唯一的外部資源是 Google Fonts 的 Archivo Black（只用在數字與英文標籤，Latin 子集）。離線或載入失敗時自動退回系統字型，不影響任何功能；中文一律使用系統字型，刻意不載 CJK 網頁字型（那會是好幾 MB，離線就毀了）
- 資料存在各自手機的 localStorage，**不會**在團員之間同步
- 深淺色會跟隨系統，右上角按鈕可手動切換

## 資料來源與正確性

行程、時間、價格、住宿名稱全部擷取自 `2026九州行程0927~1005.xls`，未經改寫。

- 飯店地址與電話為網路查證結果，出發前建議再和訂房確認信核對。
- 飯店卡片的插畫是手繪 SVG，不是實際照片 — Artifact 平台的 CSP 會擋掉所有外部圖片，飯店官方宣傳照也有版權。要看真實照片請點卡片上的「地圖・照片」（Google 地圖相簿）或「官方網站」。
- 長崎住宿除了 JPY 29,486，另有一筆 TWD 7,228（4 人），原始表格沒寫明對應哪一間房。
- 「指南」分頁的景點與美食是一般旅遊建議，不是已排定的行程。
- 營業時間、票價與活動舉辦與否，請以官方即時公告為準。
