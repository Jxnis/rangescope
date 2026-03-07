# RangeScope 🔍

> AI-powered blockchain wallet forensics and investigation agent with cross-case pattern detection

RangeScope is an intelligent investigation platform that combines Range's blockchain intelligence APIs with AI-powered analysis to provide comprehensive wallet risk assessments, connection mapping, and cross-case pattern detection.

![RangeScope](https://img.shields.io/badge/Next.js-16.1.6-black?style=flat-square&logo=next.js)
![React](https://img.shields.io/badge/React-19.2.4-blue?style=flat-square&logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue?style=flat-square&logo=typescript)
![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)

## ✨ Features

### 🔍 Comprehensive Wallet Analysis
- **Risk Triage**: Multi-factor risk assessment using Range's risk scoring
- **Sanctions Screening**: Real-time OFAC and blacklist verification
- **Entity Identification**: Automatic detection of known wallets, exchanges, and entities
- **Connection Mapping**: Interactive force-directed graph of wallet relationships
- **Funding Origin Tracing**: Track where wallets get their initial funding
- **Asset Flow Analysis**: Historical transaction volume and token movements
- **Counterparty Risk Scanning**: 2-hop network analysis for indirect exposure

### 🧠 AI-Powered Intelligence
- **LLM-Generated Reports**: Compliance-style investigation summaries using OpenRouter
- **Natural Language Analysis**: Convert complex blockchain data into actionable insights
- **Contextual Risk Assessment**: AI explains patterns and provides recommendations

### 🔗 Cross-Case Pattern Detection
RangeScope's unique **memory system** learns from historical investigations:

- **Shared Funding Detection**: Identifies wallets funded by the same source (potential batch operations)
- **Counterparty Overlap**: Detects wallets sharing significant transaction partners (coordinated activity)
- **Behavioral Similarity**: Vector-based matching finds wallets with similar risk profiles and activity patterns
- **Confidence Scoring**: Each pattern comes with evidence-based confidence levels
- **Interactive Case Links**: Click through to related investigations

### 🎨 Professional UI/UX
- **Real-time Progress**: SSE streaming shows investigation pipeline steps live
- **Interactive Visualizations**: Zoom, pan, and explore connection graphs
- **Dark/Light Themes**: Automatic theme switching with system preference sync
- **Responsive Design**: Works on desktop, tablet, and mobile
- **Professional Aesthetics**: Clean, blockchain-explorer-inspired interface

## 🏗️ Architecture

### Tech Stack

**Frontend:**
- Next.js 16.1.6 (App Router)
- React 19.2.4
- TypeScript 5.x
- Tailwind CSS 4.x
- react-force-graph-2d (Network visualization)
- next-themes (Theme management)

**Backend:**
- Next.js API Routes
- SQLite (better-sqlite3) for case memory
- OpenRouter API for LLM analysis
- Range API (REST + MCP hybrid)

**AI/LLM:**
- Default: `arcee-ai/trinity-large-preview:free`
- Fallback chain for rate-limit resilience
- Streaming report generation

### Data Flow

```
1. User Input (Address + Network)
   ↓
2. Investigation Pipeline (9 steps, parallel batching)
   ├─ Risk Triage
   ├─ Sanctions Check
   ├─ Entity Identification
   ├─ Connections Analysis
   ├─ Funding Origin Tracing
   ├─ Asset Flow Analysis
   ├─ Hop2 Risk Scanning
   ├─ Pattern Matching (Memory System)
   └─ AI Report Generation
   ↓
3. Results Display (Scorecard + Graph + Report)
   ↓
4. Memory Storage (SQLite + Vector Database)
```

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ (or Bun 1.x)
- pnpm (recommended) or npm
- Range API key
- OpenRouter API key

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/rangescope.git
cd rangescope

# Install dependencies
pnpm install

# Set up environment variables
cp .env.local.example .env.local
```

### Environment Configuration

Edit `.env.local` with your API keys:

```env
# Range API Configuration
RANGE_API_KEY=your_range_api_key_here

# OpenRouter Configuration (for AI reports)
OPENROUTER_API_KEY=your_openrouter_api_key_here
OPENROUTER_MODEL=arcee-ai/trinity-large-preview:free
OPENROUTER_SITE_URL=http://localhost:3000
OPENROUTER_SITE_NAME=RangeScope
```

### Development

```bash
# Start development server
pnpm dev

# Build for production
pnpm build

# Start production server
pnpm start
```

Open [http://localhost:3000](http://localhost:3000) to view the app.

## 📖 Usage Guide

### Running an Investigation

1. **Select Network**: Choose from Ethereum, Arbitrum, Base, Solana, Cosmos Hub, or Osmosis
2. **Enter Address**: Paste a wallet address (e.g., `0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb`)
3. **Start Investigation**: Click "Start Investigation"
4. **Watch Progress**: Real-time SSE streaming shows each pipeline step
5. **Review Results**: Explore the risk scorecard, connection graph, and AI report

### Understanding Results

**Risk Scorecard (Left Panel):**
- Risk level with color coding (Very Low → Critical)
- Sanctions status (OFAC, blacklists)
- Entity information (exchanges, known addresses)
- Funding origin details
- Activity metrics (transactions, volume)

**Connection Graph (Right Panel):**
- Interactive force-directed graph
- Root node (larger, bordered)
- Counterparties sized by risk
- Sanctioned nodes highlighted in red
- Hover for details, drag to explore

**Investigation Report (Bottom):**
- Executive summary
- Risk assessment breakdown
- Entity profile
- Fund flow analysis
- Cross-case intelligence findings
- Recommendations

**Pattern Alerts (Top, if detected):**
- Shared funding sources
- Counterparty network overlaps
- Behavioral similarity matches
- Clickable links to related cases

### Case History

- View all past investigations at `/cases`
- Click any case to see full details
- Deduplicated by address+network
- Searchable and filterable

## 🧪 Testing

### Test Wallets

Try these addresses to see different scenarios:

**High Activity Wallet:**
```
Address: 0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb
Network: Ethereum
Expected: MEV bot, many connections, high volume
```

**Known Entity:**
```
Address: 0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045
Network: Ethereum
Expected: Vitalik Buterin, extensive history
```

**Flagged Address:**
```
Address: 0x412BC03309d61D372B13dDC9BD3b63B192F03863
Network: Ethereum
Expected: Phishing label, low activity, risk flags
```

See [TEST_WALLETS.md](./TEST_WALLETS.md) for more test scenarios.

## 🔧 Configuration

### Supported Networks

Currently supports:
- **Ethereum** (EVM)
- **Arbitrum** (L2)
- **Base** (L2)
- **Solana**
- **Cosmos Hub** (cosmoshub-4)
- **Osmosis** (osmosis-1)

*Note: Bitcoin, Tron, Polygon, and Optimism are not currently supported by Range API.*

### Investigation Guardrails

Configured in `lib/constants.ts`:

```typescript
export const GUARDRAILS = {
  MAX_HOPS: 2,                    // Maximum network depth
  MAX_API_CALLS_PER_RUN: 25,     // Budget per investigation
  MAX_COUNTERPARTIES: 10,         // Connections to fetch
  MAX_HOP2_SCANS: 5,              // Secondary risk scans
  INVESTIGATION_TIMEOUT_MS: 45000, // 45 second timeout
  CACHE_TTL_HOURS: 24,            // Historical data reuse
}
```

### Pattern Detection Thresholds

Memory system thresholds in `lib/memory.ts`:

- **Behavioral Similarity**: 0.82+ cosine similarity
- **Shared Funders**: 1+ matching funder
- **Counterparty Overlap**: 2+ shared counterparties
- **Confidence Levels**: Very High (90%), High (75%), Medium (60%), Low (50%)

## 📊 Data Sources

### Range API Integration

RangeScope uses a **hybrid REST + MCP approach**:

1. **Primary Path**: Range REST API endpoints
   - `/v1/risk/address` - Risk assessment
   - `/v1/risk/sanctions/{address}` - Sanctions screening
   - `/v1/address` - Entity information

2. **Fallback Path**: Range MCP (Model Context Protocol) tools
   - When REST endpoints return 404 or errors
   - Automatic session management
   - Response normalization

### Memory System

**SQLite Database Schema:**

```sql
-- Cases table
CREATE TABLE cases (
  id TEXT PRIMARY KEY,
  address TEXT,
  network TEXT,
  timestamp TEXT,
  riskLevel TEXT,
  -- ... full investigation results
);

-- Connections tracking
CREATE TABLE connections (
  id INTEGER PRIMARY KEY,
  caseId TEXT,
  fromAddress TEXT,
  toAddress TEXT,
  -- ... relationship metadata
);

-- Funding sources
CREATE TABLE funding_sources (
  id INTEGER PRIMARY KEY,
  caseId TEXT,
  address TEXT,
  funderAddress TEXT,
  -- ... funding details
);

-- Behavioral vectors
CREATE TABLE case_vectors (
  id INTEGER PRIMARY KEY,
  caseId TEXT,
  address TEXT,
  network TEXT,
  vector TEXT, -- JSON array of 12 features
  summary TEXT
);
```

## 🎯 Hackathon Demo Tips

### Quick Demo Flow (3 minutes)

1. **Open Homepage** - Explain the concept (15 sec)
2. **Start Investigation** - Enter test wallet, show real-time progress (30 sec)
3. **Explore Results** - Navigate scorecard → graph → report (60 sec)
4. **Show Patterns** - Run second wallet, demonstrate pattern detection (45 sec)
5. **Case History** - Show memory persistence (30 sec)

### Key Talking Points

- ✅ **AI Positioning**: "Agentic investigation pipeline with LLM summarization"
- ✅ **Differentiation**: "Memory system learns from past investigations"
- ✅ **Range Integration**: "Hybrid REST + MCP for comprehensive coverage"
- ✅ **Practical Use**: "Compliance teams, fraud detection, due diligence"

### Demo Presets

Add these to `.env.local` for quick access:

```env
DEMO_WALLET_1=0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb
DEMO_WALLET_2=0x412BC03309d61D372B13dDC9BD3b63B192F03863
DEMO_WALLET_3=0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045
```

## 📝 API Reference

### POST /api/investigate

Start a new investigation (SSE streaming response).

**Request:**
```json
{
  "address": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
  "network": "ethereum"
}
```

**Response (SSE):**
```
event: step
data: {"step":"risk_triage","status":"running"}

event: step
data: {"step":"risk_triage","status":"done","data":{...}}

event: graph
data: {"nodes":[...],"links":[...]}

event: report
data: {"content":"# Investigation Report\n\n..."}

event: done
data: {"caseId":"uuid-here"}
```

### GET /api/cases

List all investigation cases.

**Query Params:**
- `limit` (default: 50)
- `offset` (default: 0)

**Response:**
```json
{
  "cases": [
    {
      "id": "uuid",
      "address": "0x...",
      "network": "ethereum",
      "timestamp": "2026-03-07T...",
      "riskLevel": "VERY_LOW",
      "isSanctioned": false
    }
  ]
}
```

### GET /api/cases/[id]

Get full details for a specific case.

**Response:**
```json
{
  "id": "uuid",
  "address": "0x...",
  "network": "ethereum",
  "risk": {...},
  "sanctions": {...},
  "entity": {...},
  "connections": [...],
  "patterns": [...],
  "report": "..."
}
```

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Development Workflow

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Test thoroughly (use test wallets)
5. Commit with conventional commits (`feat:`, `fix:`, `docs:`, etc.)
6. Push to your fork
7. Open a Pull Request

### Code Style

- TypeScript strict mode
- ESLint + Prettier
- Conventional commits
- Component documentation

## 📜 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Range** - For providing comprehensive blockchain intelligence APIs
- **OpenRouter** - For accessible LLM inference
- **Next.js Team** - For the amazing React framework
- **Force Graph** - For the network visualization library

## 📧 Support

- **Issues**: [GitHub Issues](https://github.com/yourusername/rangescope/issues)
- **Discussions**: [GitHub Discussions](https://github.com/yourusername/rangescope/discussions)
- **Email**: your.email@example.com

## 🗺️ Roadmap

- [ ] Export reports to PDF
- [ ] Batch investigation mode
- [ ] Custom alert rules
- [ ] Webhook notifications
- [ ] Advanced pattern filters
- [ ] More blockchain networks
- [ ] GraphQL API
- [ ] Multi-user support

---

**Built for the Range Hackathon 2026** 🚀

*Investigating wallets, detecting patterns, protecting users.*
