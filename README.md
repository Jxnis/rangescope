# RangeScope

**An AI-powered wallet forensics investigation agent with behavioral memory**

RangeScope is a blockchain forensics platform that investigates wallet addresses across multiple chains, learns behavioral patterns from historical cases, and surfaces hidden coordination risks through AI-powered analysis.

Built for the Range AI Hackathon • [Live Demo](#) • [Documentation](./GAMEPLAN.md)

---

## ✨ Key Features

### 🤖 Investigation Copilot (AI Chat Assistant)
Interactive forensics assistant that answers natural-language questions with **live blockchain data**:
- "What is the risk level of this wallet?"
- "Show me the top counterparties"
- "Has this address been sanctioned?"
- Dynamically calls Range API based on your question
- Provides compliance-ready explanations with citations

### 🧠 Behavioral Memory System
Cross-case pattern detection using **12-dimensional behavioral vectors**:
- **Cosine similarity matching** (0.82 threshold) across investigations
- **Cross-chain cluster detection** - finds same entity operating on multiple networks
- **Shared funder patterns** - identifies coordinated funding sources
- **Counterparty overlap** - surfaces hidden relationships

### 📊 Rich Investigation Dashboard
Comprehensive risk visualization with:
- **Risk Score Ring** - Visual risk indicator (0-10 scale)
- **Investigation Insights Panel**:
  - Risk Contagion % (how much risk comes from counterparties)
  - Behavioral Match detection (similarity to known bad actors)
  - Network Role analysis (Hub/Active/Leaf classification)
- **Quick Stats** - Transactions, Volume, Counterparties, Hop-2 scanned
- **Entity Profile** - Labels, categories, tags from Range intelligence
- **Funding Source** - First funder tracing
- **Top Counterparties** - Risk-colored mini-table with transfer counts
- **Asset Flow Timeline** - Inflow/outflow visualization with token symbols

### 🔍 Intelligent Network Detection
Auto-detects blockchain network from address format:
- `0x...` → Ethereum/EVM chains
- `cosmos1...` → Cosmos Hub
- `osmo1...` → Osmosis
- Base58 → Solana

### 🎨 Polished UX
- **Skeleton loading** - Shows dashboard preview during investigation
- **Smooth micro-animations** - Motion presets for hero sections and cards
- **Mobile-responsive** - Adaptive padding and layouts for all screen sizes
- **Dark/Light themes** - System-aware theme toggle
- **Live progress streaming** - Real-time SSE step updates

### 📈 Force-Directed Connection Graph
Industry-standard visualization for forensics:
- Risk-colored nodes (green → red gradient)
- Directional relationships (funding, transactions)
- Natural clustering of related entities
- Hover details with entity labels
- Single-node fallback for isolated wallets

### 📝 AI-Generated Reports
Compliance-ready markdown reports with:
- Executive Summary
- Risk Assessment (score, sanctions, confidence)
- Entity Profile (labels, behavioral stats)
- Fund Flow Analysis (sources, counterparties, assets)
- Cross-Case Intelligence (pattern matches)
- Conclusion & Recommendation (CLEAR/MONITOR/SUSPICIOUS/BLOCK)

### 🔗 Hybrid REST + MCP Architecture
- Primary: Range REST API for predictable performance
- Fallback: Range MCP tools (21 tools) when REST unavailable
- Best of both worlds: speed + coverage

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- pnpm (or npm)
- Range API Key ([Get one here](https://www.range.org/))
- OpenRouter API Key ([Get one here](https://openrouter.ai/))

### Installation

```bash
# Clone the repo
git clone https://github.com/yourusername/rangescope.git
cd rangescope

# Install dependencies
pnpm install

# Copy environment template
cp .env.local.example .env.local

# Add your API keys to .env.local
RANGE_API_KEY=your_range_api_key
OPENROUTER_API_KEY=your_openrouter_api_key
OPENROUTER_MODEL=qwen/qwen3-vl-30b-a3b-thinking  # Optional

# Run development server
pnpm dev
```

Visit [http://localhost:3000](http://localhost:3000)

### Test Wallets

Use official Range API test addresses:

**Ethereum:**
- `0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb` (Normal activity)
- `0x8576accC0330f6f56C8C42F580D6F1f2c5e7D8d3` (High risk)

**Solana:**
- `7cvkjYAkUYs4W8XcXsca7cBrEGFeSUjeZmKoNBvEwyri` (Normal)
- `675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8` (Raydium)

See [`TEST_WALLETS.md`](./TEST_WALLETS.md) for full list across all networks.

---

## 🏗️ Architecture

```
User Input (auto-detects network)
    ↓
POST /api/investigate (SSE streaming)
    ↓
9-Step Investigation Pipeline:
  1. get_address_risk
  2. check_sanctions
  3. get_entity
  4. get_connections
  5. get_first_funder
  6. get_asset_flows
  7. get_address_features
  8. cross_case_patterns (behavioral vectors + shared funders + counterparty overlap)
  9. save_to_memory (SQLite + vector store)
    ↓
AI Report Generation (OpenRouter LLM)
    ↓
Frontend Dashboard + Investigation Copilot
```

### Tech Stack
- **Framework:** Next.js 16 (App Router, React 19, TypeScript)
- **AI:** OpenRouter (Qwen 3 VL 30B, Llama 3.3 70B fallback)
- **Database:** SQLite (better-sqlite3) with vector storage
- **Blockchain Intel:** Range API (REST + MCP hybrid)
- **Visualization:** react-force-graph-2d with D3
- **Styling:** Tailwind CSS 4.1 with dark mode
- **Animation:** Motion (Framer Motion)

---

## 📖 Core Concepts

### Behavioral Vectors
Each investigation is encoded as a **12-dimensional feature vector**:
1. Risk level score (0-1)
2. Raw risk score (0-1, normalized)
3. Sanctions flag (0/1)
4. Blacklist flag (0/1)
5. Connection count (normalized)
6. Has funding origin (0/1)
7. Transaction count (normalized)
8. Volume signal (log scale)
9. Counterparties count (normalized)
10. Active days (normalized)
11. Hop-2 high-risk ratio (0-1)
12. Has entity (0/1)

**Cosine similarity** matches cases above 0.82 threshold, enabling cross-chain behavioral clustering.

### Pattern Detection
Three pattern types:
- **Shared Funders** - Multiple wallets funded by same source
- **Counterparty Overlap** - Significant shared transaction partners
- **Behavioral Similarity** - Vector cosine distance < 0.82

Patterns surface in **Pattern Alerts** with evidence explanations.

### Investigation Insights (New!)
AI-computed analytics:
- **Risk Contagion %** - How much of wallet's risk comes from counterparties (visual progress bar)
- **Behavioral Match** - "Similar to known cases" vs "Unique pattern"
- **Network Role** - Hub (>20 connections), Active (5-20), or Leaf (<5)

---

## 🎯 Why This Stands Out

### For Range (Hackathon Judges)
- **Builds your product roadmap:** Investigation Copilot, automated reports, alert narratives (all explicitly mentioned in your docs)
- **MCP showcase:** Hybrid REST+MCP architecture with 21-tool coverage
- **AI positioning:** Not just a UI wrapper—actual agentic orchestration + memory layer

### For Compliance Teams
- **Cross-case memory:** Learns from every investigation, surfaces patterns others miss
- **AI explainability:** Every insight is backed by specific data points
- **Compliance-ready:** Reports follow SAR/AML format standards

### For 2026 AI Trends
- **Agentic infrastructure:** Investigation Copilot = autonomous analyst
- **Behavioral fingerprinting:** Vector similarity for entity clustering
- **Real-time data fusion:** Live API calls within conversational interface
- **Persistent memory:** SQLite-backed case history with retrieval

---

## 📁 Project Structure

```
rangescope/
├── app/
│   ├── page.tsx                    # Landing page (hero + form)
│   ├── investigate/page.tsx        # Live investigation (SSE streaming)
│   ├── cases/page.tsx             # Case history list
│   ├── cases/[id]/page.tsx        # Case detail view
│   └── api/
│       ├── investigate/route.ts   # Investigation pipeline + report gen
│       ├── copilot/route.ts       # AI chat with live data fetching
│       └── cases/                 # Case CRUD APIs
├── components/
│   ├── RiskScorecard.tsx          # Main dashboard (insights panel NEW)
│   ├── ConnectionGraph.tsx        # Force-directed graph
│   ├── InvestigationCopilot.tsx   # Floating chat panel (NEW)
│   ├── InvestigationReport.tsx    # Markdown report viewer
│   ├── PatternAlerts.tsx          # Cross-case pattern badges
│   ├── StepProgress.tsx           # Live SSE progress bar
│   ├── Skeleton.tsx               # Loading state (NEW)
│   └── ...
├── lib/
│   ├── investigation.ts           # 9-step pipeline orchestrator
│   ├── range.ts                   # Range API wrapper (REST + MCP)
│   ├── gemini.ts                  # OpenRouter LLM wrapper
│   ├── memory.ts                  # Behavioral vector similarity
│   ├── patterns.ts                # Cross-case pattern matching
│   ├── db.ts                      # SQLite schema + queries
│   ├── utils.ts                   # Network detection + helpers
│   ├── motion-presets.tsx         # Animation utilities (NEW)
│   └── constants.ts               # Risk colors, networks, steps
├── GAMEPLAN.md                    # Architecture decisions (single source of truth)
├── TEST_WALLETS.md                # Official Range test addresses
└── README.md                      # This file
```

---

## 🔧 Environment Variables

```bash
# Required
RANGE_API_KEY=your_range_api_key_here
OPENROUTER_API_KEY=your_openrouter_api_key_here

# Optional
OPENROUTER_MODEL=qwen/qwen3-vl-30b-a3b-thinking  # Default model
# Fallback chain: qwen → nvidia/llama-3.3-70b → arcee-ai/trinity-large
```

---

## 🚢 Deployment

### Vercel (Recommended)

```bash
cd rangescope
npx vercel
```

Set environment variables in Vercel dashboard:
- `RANGE_API_KEY`
- `OPENROUTER_API_KEY`
- `OPENROUTER_MODEL` (optional)

**Note:** SQLite DB is ephemeral on Vercel (resets on cold starts). For production, migrate to Turso/libsql.

---

## 🤝 Contributing

See [`CONTRIBUTING.md`](./CONTRIBUTING.md) for development setup, code style, and PR guidelines.

---

## 📄 License

MIT License - see [`LICENSE`](./LICENSE)

---

## 🎥 Demo Script (3 minutes)

1. **Landing Page** (0:00-0:30)
   - Enter test wallet (auto-detects network with badge)
   - Show smooth hero animations

2. **Live Investigation** (0:30-1:30)
   - Watch SSE progress steps stream in real-time
   - Skeleton loading → smooth fade to dashboard
   - Point out Investigation Insights panel (risk contagion, behavioral match)
   - Show pattern alerts with evidence

3. **Investigation Copilot** (1:30-2:30)
   - Click floating chat button
   - Ask: "What is the risk level?" → Live API call + AI response
   - Ask: "Who are the top counterparties?" → Dynamically fetches + explains
   - Show markdown formatting and citations

4. **Cross-Case Memory** (2:30-3:00)
   - Navigate to case history
   - Run second investigation of similar wallet
   - Show behavioral similarity pattern match
   - Explain vector-based clustering

---

## 🏆 Hackathon Highlights

- ✅ **Investigation Copilot** - Prototypes Range's product roadmap feature
- ✅ **21 MCP tools** - Hybrid REST+MCP coverage for all scenarios
- ✅ **Behavioral fingerprinting** - 12D vectors with cosine similarity
- ✅ **Cross-chain clustering** - Detects same entity across networks
- ✅ **AI report generation** - Compliance-ready markdown with evidence
- ✅ **Real-time streaming** - SSE progress with skeleton loading
- ✅ **Mobile-responsive** - Works on all devices
- ✅ **Production-ready** - Vercel deployable with proper error handling

---

## 🔗 Links

- **Range Docs:** https://docs.range.org/
- **Range MCP Tools:** https://github.com/rangedotai/mcp
- **OpenRouter:** https://openrouter.ai/
- **Bubblemaps (reference):** https://bubblemaps.io/ *(Note: Force graphs are better for forensics)*

---

## 💡 Future Roadmap

- [ ] **Autonomous Monitoring Agents** - 24/7 address watchers with auto-investigation
- [ ] **Predictive Risk Model** - ML-based risk forecasting
- [ ] **Webhook Actions** - Auto-freeze/notify/report on pattern matches
- [ ] **Multi-Hop Risk Diffusion** - Propagate risk scores through network
- [ ] **PDF Export** - One-click compliance report download
- [ ] **Turso/libsql Migration** - Persistent DB for production
- [ ] **x402 Payment Triggers** - Automated investigation on risk threshold breaches

---

**Built with ❤️ for the Range AI Hackathon**
