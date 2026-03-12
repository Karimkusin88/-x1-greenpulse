# 🌿 X1 GreenPulse

**DePIN Energy Monitoring & Carbon Credit NFT Platform built on X1 EcoChain**

[![Built on X1 EcoChain](https://img.shields.io/badge/Built%20on-X1%20EcoChain-22c55e?style=for-the-badge)](https://x1ecochain.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue?style=for-the-badge)](LICENSE)
[![Grant Program](https://img.shields.io/badge/Grant-$5M%20Program-purple?style=for-the-badge)](https://grant.x1ecochain.com)

---

## 🎯 Overview

X1 GreenPulse is a decentralized platform that brings transparency, accountability, and gamification to blockchain energy consumption. It provides:

- 📊 **Real-Time Energy Dashboard** — Monitor validator energy usage vs other chains
- 🏆 **Green Score System** — Rate validators on energy efficiency (0-100 score)
- 🌿 **Carbon Credit NFT Marketplace** — Trade verified carbon offset certificates on-chain
- 🤖 **AI Energy Optimizer** — Personalized recommendations to reduce energy footprint

## ⚡ Why X1 EcoChain?

| Metric | X1 EcoChain | Ethereum | Solana |
|--------|-------------|----------|--------|
| Energy/Node | **3 Wh** | 600 Wh | 170 Wh |
| Gas Fees | Sub-cent | ~$1-50 | ~$0.01 |
| Consensus | PoA | PoS | PoH+PoS |
| Finality | Instant | ~12min | ~0.4s |

## 🏗️ Architecture

```
┌──────────────────────────────────────────────────┐
│                  Frontend dApp                    │
│   Dashboard │ Marketplace │ AI Chat │ Leaderboard │
├──────────────────────────────────────────────────┤
│              Smart Contracts (EVM)                │
│  GreenPulseCarbonCredit.sol │ GreenScoreOracle.sol│
├──────────────────────────────────────────────────┤
│           X1 EcoChain (PoA, ~3Wh)                │
│         Sub-cent gas │ Instant finality           │
└──────────────────────────────────────────────────┘
```

## 📁 Project Structure

```
x1-greenpulse/
├── index.html              # Main dApp frontend
├── styles.css              # Design system & styles
├── app.js                  # Application logic
├── whitepaper.html         # Project whitepaper
├── contracts/
│   ├── GreenPulseCarbonCredit.sol    # Carbon Credit NFT (ERC-721)
│   └── GreenScoreOracle.sol          # Energy metrics oracle
└── README.md
```

## 🚀 Quick Start

```bash
# Clone the repo
git clone https://github.com/karimkusin/x1-greenpulse.git
cd x1-greenpulse

# Serve locally
npx http-server . -p 8080 -o
```

## 📋 Smart Contracts

### GreenPulseCarbonCredit.sol
- **Standard:** ERC-721 (with Enumerable + URIStorage)
- **Purpose:** Mint, verify, and trade carbon credit NFTs
- **Features:** Validator registration, Green Score gating, credit verification lifecycle

### GreenScoreOracle.sol
- **Purpose:** On-chain energy metrics reporting and score calculation
- **Formula:** `Score = Energy(40%) + Uptime(30%) + Carbon(20%) + Network(10%)`
- **Data Source:** DePIN sensors via authorized reporters

## 🌱 Green Score Formula

```
Green Score = (Energy Efficiency × 0.40)
            + (Uptime × 0.30)
            + (Carbon Savings × 0.20)
            + (Network Contribution × 0.10)
```

| Tier | Score | Benefits |
|------|-------|----------|
| 🌳 Elite | 95-100 | 2,500 X1/month + Exclusive NFT |
| 🌿 Advanced | 85-94 | 1,800 X1/month |
| 🍃 Intermediate | 70-84 | 1,200 X1/month |
| 🌱 Beginner | 60-69 | 600 X1/month |

## 🗺️ Roadmap

| Phase | Timeline | Milestones |
|-------|----------|------------|
| 1. Foundation | Days 1-30 | Smart contracts deploy, dashboard launch |
| 2. Carbon Credits | Days 31-60 | NFT marketplace, 100+ validators |
| 3. AI & Scale | Days 61-90 | GreenAI optimizer, DePIN integration |
| 4. Mainnet | Days 91-120 | Mainnet deploy, enterprise API |

## 👤 Team

| | |
|---|---|
| **Founder** | KarimKusin |
| **Wallet** | `0x7172...888B` |
| **Email** | karimkusin@gmail.com |
| **Network** | X1 EcoChain |

## 📄 License

MIT License — see [LICENSE](LICENSE) for details.

## 🔗 Links

- [X1 EcoChain](https://x1ecochain.com)
- [Grant Program $5M](https://grant.x1ecochain.com)
- [Dev Portal](https://dev.x1ecochain.com)
- [Testnet / Airdrop](https://testnet.x1ecochain.com)
- [Block Explorer](https://maculatus-scan.x1eco.com)
- [Whitepaper](whitepaper.html)

---

**Built with 💚 on X1 EcoChain — The world's most energy-efficient Layer-1**
