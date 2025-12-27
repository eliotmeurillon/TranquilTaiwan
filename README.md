# 寧靜台灣 (TranquilTaiwan)

**Livability Index Platform for Taiwan**

TranquilTaiwan provides comprehensive "Livability Scores" for any address in Taiwan by aggregating invisible nuisances (noise, pollution, industrial risks) that real estate agents never mention.

## 🎯 Concept

TranquilTaiwan fills a critical information gap in Taiwan's real estate market by providing hyper-local residential intelligence. While platforms like 591 and Sinyi focus on economic metrics (price per ping, rental yield), they have a structural disinterest in highlighting property flaws (noise, pollution).

## ✨ Features

- **Comprehensive Scoring**: Calculates 5 key metrics:
  - **Noise Score**: Traffic, temples, major roads
  - **Air Quality**: PM2.5, AQI, dengue risk
  - **Safety**: Accident hotspots, crime rates, pedestrian safety
  - **Convenience**: YouBike stations, public transport, essential services
  - **Zoning Risk**: Adjacent industrial/commercial zone analysis

- **Freemium Model**: 
  - Free: Overall livability score and basic metrics
  - Premium: Detailed reports with historical data and comprehensive breakdowns

- **Data Sources**: Integrates with Taiwan government APIs (OGDL license):
  - Environmental Protection Administration (noise, air quality)
  - Traffic accident databases
  - Urban planning and zoning data
  - Public service APIs (YouBike, trash collection, etc.)

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL database
- pnpm (or npm/yarn)

### Installation

```sh
# Install dependencies
pnpm install

# Set up environment variables
cp .env.example .env
# Edit .env with your DATABASE_URL

# Run database migrations
pnpm db:push

# Start development server
pnpm dev
```

### Environment Variables

Create a `.env` file with:

```env
DATABASE_URL=postgresql://user:password@localhost:5432/tranquiltaiwan
```

**Note:** The map uses Leaflet with OpenStreetMap tiles, which is completely free and open-source. No API key required!

## 🏗️ Architecture

### Database Schema

- `addresses`: Stores addresses and coordinates
- `livability_scores`: Calculated scores for each address
- `reports`: Premium detailed reports

### Services

- `scoreCalculator.ts`: Core scoring algorithms
- `dataFetchers.ts`: Integration with Taiwan government APIs

### API Routes

- `GET /api/score?address=...`: Calculate or retrieve free score
- `GET /api/report?address=...`: Get premium detailed report

## 📊 Scoring Methodology

Scores are calculated using weighted averages:

- Noise: 25%
- Air Quality: 25%
- Safety: 20%
- Convenience: 15%
- Zoning Risk: 15%

Each metric is normalized to a 0-100 scale (higher = better).

## 🔧 Development

```sh
# Run development server
pnpm dev

# Run tests
pnpm test

# Build for production
pnpm build

# Preview production build
pnpm preview

# Database management
pnpm db:studio  # Open Drizzle Studio
pnpm db:push    # Push schema changes
pnpm db:generate # Generate migrations
```

## 🗺️ Map Visualization

The platform includes interactive maps powered by Leaflet (open-source) with:

- **Location Markers**: Pinpoint exact addresses with popups
- **Noise Heatmaps**: Visualize noise levels (red = noisy areas) using leaflet.heat
- **Air Quality Heatmaps**: Visualize air quality (red = poor air quality) using leaflet.heat
- **Toggle Controls**: Show/hide individual heatmap layers
- **Interactive Navigation**: Zoom, pan, and explore the area
- **OpenStreetMap Tiles**: Free, open-source map tiles - no API key required!

Heatmaps are generated based on the calculated scores and surrounding data points.

## 📝 TODO

- [ ] Integrate actual Taiwan government APIs
- [ ] Add geocoding service integration
- [ ] Implement payment processing for premium reports
- [x] Add map visualization with Mapbox GL JS
- [ ] Add historical data tracking
- [ ] Implement caching for API responses
- [ ] Add more detailed heatmap data from actual monitoring stations

## 📄 License

This project uses Taiwan government data under the OGDL (Open Government Data License).

## 🙏 Acknowledgments

Built with:
- [SvelteKit](https://kit.svelte.dev/)
- [Drizzle ORM](https://orm.drizzle.team/)
- [Tailwind CSS](https://tailwindcss.com/)
