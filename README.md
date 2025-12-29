# 寧靜台灣 (TranquilTaiwan)

**Livability Index Platform for Taiwan**

**台灣宜居指數平台**

---

TranquilTaiwan provides comprehensive "Livability Scores" for any address in Taiwan by aggregating invisible nuisances (noise, pollution, industrial risks) that real estate agents never mention.

寧靜台灣透過彙整房地產仲介從不提及的隱性問題（噪音、污染、工業風險），為台灣任何地址提供全面的「宜居指數」。

---

## 🎯 Concept / 概念

TranquilTaiwan fills a critical information gap in Taiwan's real estate market by providing hyper-local residential intelligence. While platforms like 591 and Sinyi focus on economic metrics (price per ping, rental yield), they have a structural disinterest in highlighting property flaws (noise, pollution).

寧靜台灣透過提供超本地化的居住情報，填補了台灣房地產市場的關鍵資訊缺口。雖然像 591 和信義房屋等平台專注於經濟指標（每坪價格、租金收益率），但它們在結構上缺乏揭露房產缺點（噪音、污染）的動機。

---

## ✨ Features / 功能特色

### Comprehensive Scoring / 綜合評分系統

Calculates 5 key metrics / 計算 5 項關鍵指標：

- **Noise Score / 噪音評分**: Traffic, temples, major roads / 交通、寺廟、主要道路
- **Air Quality / 空氣品質**: PM2.5, AQI, dengue risk / PM2.5、AQI、登革熱風險
- **Safety / 安全性**: Accident hotspots, crime rates, pedestrian safety / 事故熱點、犯罪率、行人安全
- **Convenience / 便利性**: YouBike stations, public transport, essential services / YouBike 站點、大眾運輸、基本服務
- **Zoning Risk / 分區風險**: Adjacent industrial/commercial zone analysis / 鄰近工業/商業區分析

### Freemium Model / 免費增值模式

- **Free / 免費版**: Overall livability score and basic metrics / 整體宜居指數和基本指標
- **Premium / 進階版**: Detailed reports with historical data and comprehensive breakdowns / 包含歷史資料和詳細分析的完整報告

### Data Sources / 資料來源

Integrates with Taiwan government APIs (OGDL license) / 整合台灣政府 API（OGDL 授權）：

- Environmental Protection Administration (noise, air quality) / 環保署（噪音、空氣品質）
- Traffic accident databases / 交通事故資料庫
- Urban planning and zoning data / 都市規劃與分區資料
- Public service APIs (YouBike, trash collection, etc.) / 公共服務 API（YouBike、垃圾清運等）

---

## 🚀 Getting Started / 快速開始

### Prerequisites / 系統需求

- Node.js 18+
- PostgreSQL database / PostgreSQL 資料庫
- pnpm (or npm/yarn)

### Installation / 安裝步驟

```sh
# Install dependencies / 安裝依賴套件
pnpm install

# Set up environment variables / 設定環境變數
# Create a .env file with the following variables:
# 建立 .env 檔案並設定以下變數：
# DATABASE_URL=postgresql://user:password@localhost:5432/tranquiltaiwan
# MOENV_API_KEY=your_moenv_api_key
# TDX_CLIENT_ID=your_tdx_client_id
# TDX_CLIENT_SECRET=your_tdx_client_secret

# Run database migrations / 執行資料庫遷移
pnpm db:push

# Start development server / 啟動開發伺服器
pnpm dev
```

### Environment Variables / 環境變數

Create a `.env` file with:

建立 `.env` 檔案並包含以下內容：

```env
# Database / 資料庫
DATABASE_URL=postgresql://user:password@localhost:5432/tranquiltaiwan

# Taiwan Government APIs / 台灣政府 API
MOENV_API_KEY=your_moenv_api_key
TDX_CLIENT_ID=your_tdx_client_id
TDX_CLIENT_SECRET=your_tdx_client_secret

# Optional: PostHog Analytics / 選填：PostHog 分析
POSTHOG_KEY=your_posthog_key
POSTHOG_HOST=https://app.posthog.com
```

**Note:** The map uses Leaflet with OpenStreetMap tiles, which is completely free and open-source. No API key required!

**注意：** 地圖使用 Leaflet 搭配 OpenStreetMap 圖磚，完全免費且開源。無需 API 金鑰！

---

## 🏗️ Architecture / 架構

### Tech Stack / 技術堆疊

- **Frontend / 前端**: SvelteKit 5, Tailwind CSS 4, Chart.js
- **Backend / 後端**: SvelteKit Server Routes, Node.js
- **Database / 資料庫**: PostgreSQL with Drizzle ORM
- **Maps / 地圖**: Leaflet.js with OpenStreetMap
- **Internationalization / 國際化**: Paraglide (inlang)
- **Analytics / 分析**: PostHog (optional)

### Database Schema / 資料庫架構

- `addresses`: Stores addresses and coordinates / 儲存地址與座標
- `livability_scores`: Calculated scores for each address / 每個地址的計算分數
- `reports`: Premium detailed reports / 進階詳細報告
- `users`: User accounts (for premium features) / 使用者帳號（用於進階功能）

### Services / 服務層

- `scoreCalculator.ts`: Core scoring algorithms / 核心評分演算法
- `dataFetchers.ts`: Integration with Taiwan government APIs / 與台灣政府 API 的整合
- `dataService.ts`: Main service orchestrating data fetching and scoring / 協調資料取得與評分的主要服務
- `addressNormalizer.ts`: Address normalization and geocoding / 地址正規化與地理編碼

### API Routes / API 路由

- `GET /api/score?address=...`: Calculate or retrieve free score / 計算或取得免費評分
- `GET /api/score/recalculate`: Recalculate score from coordinates / 從座標重新計算評分
- `GET /api/report?address=...`: Get premium detailed report / 取得進階詳細報告
- `GET /api/geocode/suggestions?q=...`: Address autocomplete / 地址自動完成

---

## 📊 Scoring Methodology / 評分方法論

Scores are calculated using weighted averages / 分數使用加權平均計算：

- Noise / 噪音: 25%
- Air Quality / 空氣品質: 25%
- Safety / 安全性: 20%
- Convenience / 便利性: 15%
- Zoning Risk / 分區風險: 15%

Each metric is normalized to a 0-100 scale (higher = better).

每項指標都標準化為 0-100 分（分數越高越好）。

### Detailed Metrics / 詳細指標

#### Noise Score / 噪音評分
- Traffic density / 交通密度
- Proximity to temples / 與寺廟的距離
- Major roads nearby / 附近主要道路
- Industrial noise sources / 工業噪音源

#### Air Quality Score / 空氣品質評分
- PM2.5 levels / PM2.5 濃度
- AQI (Air Quality Index) / 空氣品質指數
- Dengue risk zones / 登革熱風險區域
- Proximity to monitoring stations / 與監測站的距離

#### Safety Score / 安全評分
- Traffic accident hotspots / 交通事故熱點
- Crime rate statistics / 犯罪率統計
- Pedestrian safety infrastructure / 行人安全基礎設施
- Emergency services proximity / 緊急服務距離

#### Convenience Score / 便利性評分
- YouBike station availability / YouBike 站點可用性
- Public transport access / 大眾運輸可及性
- Essential services (hospitals, schools, markets) / 基本服務（醫院、學校、市場）
- Walkability score / 步行友善度

#### Zoning Risk Score / 分區風險評分
- Adjacent industrial zones / 鄰近工業區
- Commercial zone proximity / 商業區距離
- Future development plans / 未來開發計畫
- Environmental protection zones / 環境保護區

---

## 🔧 Development / 開發

### Available Scripts / 可用指令

```sh
# Run development server / 啟動開發伺服器
pnpm dev

# Run tests / 執行測試
pnpm test
pnpm test:unit    # Unit tests / 單元測試
pnpm test:e2e     # End-to-end tests / 端對端測試

# Build for production / 建置生產版本
pnpm build

# Preview production build / 預覽生產版本
pnpm preview

# Code quality / 程式碼品質
pnpm check        # Type checking / 型別檢查
pnpm lint         # Linting / 程式碼檢查
pnpm format       # Format code / 格式化程式碼

# Database management / 資料庫管理
pnpm db:studio    # Open Drizzle Studio / 開啟 Drizzle Studio
pnpm db:push      # Push schema changes / 推送架構變更
pnpm db:generate  # Generate migrations / 產生遷移檔案
pnpm db:migrate   # Run migrations / 執行遷移
```

### Project Structure / 專案結構

```
src/
├── lib/
│   ├── components/        # Svelte components / Svelte 元件
│   │   ├── charts/        # Chart components / 圖表元件
│   │   ├── ui/           # UI components (shadcn) / UI 元件
│   │   └── ...           # Other components / 其他元件
│   ├── server/
│   │   ├── db/           # Database schema / 資料庫架構
│   │   └── services/     # Business logic / 業務邏輯
│   ├── stores/           # Svelte stores / Svelte 狀態管理
│   └── utils/            # Utility functions / 工具函數
├── routes/               # SvelteKit routes / SvelteKit 路由
│   ├── api/             # API endpoints / API 端點
│   └── ...              # Page routes / 頁面路由
└── paraglide/           # i18n messages / 國際化訊息
```

---

## 🗺️ Map Visualization / 地圖視覺化

The platform includes interactive maps powered by Leaflet (open-source) with:

平台包含使用 Leaflet（開源）的互動式地圖，功能包括：

- **Location Markers / 位置標記**: Pinpoint exact addresses with popups / 精確標示地址並顯示彈出視窗
- **Noise Heatmaps / 噪音熱力圖**: Visualize noise levels (red = noisy areas) using leaflet.heat / 使用 leaflet.heat 視覺化噪音等級（紅色 = 噪音區域）
- **Air Quality Heatmaps / 空氣品質熱力圖**: Visualize air quality (red = poor air quality) using leaflet.heat / 使用 leaflet.heat 視覺化空氣品質（紅色 = 空氣品質差）
- **Toggle Controls / 切換控制**: Show/hide individual heatmap layers / 顯示/隱藏個別熱力圖圖層
- **Interactive Navigation / 互動式導航**: Zoom, pan, and explore the area / 縮放、平移和探索區域
- **OpenStreetMap Tiles / OpenStreetMap 圖磚**: Free, open-source map tiles - no API key required! / 免費開源地圖圖磚 - 無需 API 金鑰！

Heatmaps are generated based on the calculated scores and surrounding data points.

熱力圖是根據計算出的分數和周圍資料點生成的。

---

## 🌐 Internationalization / 國際化

The project supports multiple languages using Paraglide (inlang):

專案使用 Paraglide (inlang) 支援多種語言：

- English (en) / 英文
- Traditional Chinese (zh-tw) / 繁體中文

Language files are located in `/messages/` and automatically compiled by Paraglide.

語言檔案位於 `/messages/`，並由 Paraglide 自動編譯。

---

## 🧪 Testing / 測試

The project includes comprehensive testing:

專案包含完整的測試：

- **Unit Tests / 單元測試**: Using Vitest / 使用 Vitest
- **E2E Tests / 端對端測試**: Using Playwright / 使用 Playwright
- **API Tests / API 測試**: Testing data fetchers and services / 測試資料取得器與服務

Run all tests with:

執行所有測試：

```sh
pnpm test
```

---

## 📝 TODO / 待辦事項

- [x] Add map visualization with Leaflet / 使用 Leaflet 新增地圖視覺化
- [x] Implement caching for API responses / 實作 API 回應快取
- [x] Add geocoding service integration / 新增地理編碼服務整合
- [ ] Integrate additional Taiwan government APIs / 整合更多台灣政府 API
- [ ] Implement payment processing for premium reports / 實作進階報告的付款處理
- [ ] Add historical data tracking / 新增歷史資料追蹤
- [ ] Add more detailed heatmap data from actual monitoring stations / 從實際監測站新增更詳細的熱力圖資料
- [ ] Implement user authentication / 實作使用者認證
- [ ] Add report sharing and export features / 新增報告分享與匯出功能

---

## 📄 License / 授權

This project uses Taiwan government data under the OGDL (Open Government Data License).

本專案使用台灣政府資料，遵循 OGDL（政府資料開放授權條款）。

---

## 🙏 Acknowledgments / 致謝

Built with / 使用以下技術建構：

- [SvelteKit](https://kit.svelte.dev/) - Full-stack framework / 全端框架
- [Drizzle ORM](https://orm.drizzle.team/) - TypeScript ORM / TypeScript ORM
- [Tailwind CSS](https://tailwindcss.com/) - Utility-first CSS / 工具優先的 CSS
- [Leaflet](https://leafletjs.com/) - Open-source map library / 開源地圖函式庫
- [Chart.js](https://www.chartjs.org/) - Chart library / 圖表函式庫
- [Paraglide](https://inlang.com/m/gerre34r/library-inlang-paraglideJs) - Internationalization / 國際化

---

## 📧 Contact / 聯絡方式

For questions, feedback, or contributions, please contact:

如有問題、意見回饋或想要貢獻，請聯絡：

- **Email / 電子郵件**: eliot.meurillon@gmail.com
- **Project / 專案**: [TranquilTaiwan](https://github.com/yourusername/tranquiltaiwan)

---

## 🚀 Deployment / 部署

The project is configured for deployment on Vercel using the `@sveltejs/adapter-vercel` adapter.

專案已設定為使用 `@sveltejs/adapter-vercel` 適配器部署到 Vercel。

### Environment Variables for Production / 生產環境變數

Make sure to set all required environment variables in your deployment platform:

請確保在部署平台設定所有必要的環境變數：

- `DATABASE_URL`
- `MOENV_API_KEY`
- `TDX_CLIENT_ID`
- `TDX_CLIENT_SECRET`
- `POSTHOG_KEY` (optional / 選填)
- `POSTHOG_HOST` (optional / 選填)

---

**Made with ❤️ in Taiwan / 在台灣用心製作**
