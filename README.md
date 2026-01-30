# 🗳️ OpenReform

**A Decentralized Petition-to-Action Platform on Ethereum**

OpenReform enables supporters to fund petitions into escrow with milestone-based payouts to implementers. Petition content and proofs live on IPFS, and an indexer-driven timeline shows progress from creation to payouts.

![Ethereum](https://img.shields.io/badge/Ethereum-Sepolia-blueviolet)
![Solidity](https://img.shields.io/badge/Solidity-0.8.29-blue)
![Node.js](https://img.shields.io/badge/Node.js-20+-green)
![License](https://img.shields.io/badge/License-MIT-yellow)

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        OpenReform Platform                       │
├─────────────────┬──────────────────────┬────────────────────────┤
│   Module A      │      Module B        │      Module C          │
│   Contracts     │    Indexer + API     │      Frontend          │
├─────────────────┼──────────────────────┼────────────────────────┤
│ • PetitionReg   │ • Event Indexer      │ • Next.js + wagmi      │
│ • EscrowMiles   │ • REST API           │ • Wallet Connect       │
│ • ImplementerReg│ • IPFS Pinning       │ • Petition UI          │
└─────────────────┴──────────────────────┴────────────────────────┘
         ▼                    ▼                      ▼
    Sepolia Testnet      localhost:3001          localhost:3000
```

---

## 📜 Deployed Contracts (Sepolia Testnet)

| Contract | Address | Etherscan |
|----------|---------|-----------|
| **PetitionRegistry** | `0x7D377A56642aaE04A883A2f99F876F5b5142399e` | [View](https://sepolia.etherscan.io/address/0x7D377A56642aaE04A883A2f99F876F5b5142399e) |
| **ImplementerRegistry** | `0x5ce5bd6b6E6bDDFC71C1a4d64bc159E28bf909bf` | [View](https://sepolia.etherscan.io/address/0x5ce5bd6b6E6bDDFC71C1a4d64bc159E28bf909bf) |
| **EscrowMilestones** | `0x1a7a1e26dc55063f6b485619B7BAa86a222EFd5D` | [View](https://sepolia.etherscan.io/address/0x1a7a1e26dc55063f6b485619B7BAa86a222EFd5D) |

---

## 🚀 Quick Start

### Prerequisites
- Node.js 20+
- npm or yarn
- MetaMask wallet with Sepolia ETH

### 1. Clone & Install

```bash
git clone https://github.com/Hammaduddin561/OpenReform.git
cd OpenReform
```

### 2. Setup Indexer API (Module B)

```bash
cd indexer-api
npm install
cp .env.example .env
# Edit .env with your Pinata API keys
npm run dev
```

Server runs at `http://localhost:3001`

### 3. Setup Frontend (Module C)

```bash
cd frontend
npm install
npm run dev
```

Frontend runs at `http://localhost:3000`

---

## 📡 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/health` | Health check + indexer status |
| `GET` | `/api/petitions` | List all petitions |
| `GET` | `/api/petitions/:id` | Get petition details |
| `GET` | `/api/petitions/:id/timeline` | Get petition event timeline |
| `POST` | `/api/ipfs/pin` | Pin content to IPFS |
| `GET` | `/api/events/raw` | Raw events (debug) |

### Example: Pin to IPFS

```bash
curl -X POST http://localhost:3001/api/ipfs/pin \
  -H "Content-Type: application/json" \
  -d '{"content": {"title": "My Petition", "description": "..."}, "name": "petition"}'
```

Response:
```json
{
  "cid": "QmXyz...",
  "gateway": "https://gateway.pinata.cloud/ipfs/QmXyz...",
  "timestamp": 1706959632593
}
```

---

## ⚡ Smart Contract Events

All events are indexed and available via the API:

| Event | Description |
|-------|-------------|
| `PetitionCreated` | New petition created with IPFS CID |
| `Supported` | User supported a petition |
| `Funded` | ETH deposited to petition escrow |
| `ImplementerAccepted` | Implementer accepted the petition |
| `MilestoneSubmitted` | Proof submitted for milestone |
| `MilestoneApproved` | Milestone approved by voters |
| `PayoutReleased` | ETH released to implementer |
| `RefundsClaimed` | Refunds claimed after deadline |

---

## 🔧 Development

### Contracts (Module A)

```bash
cd contracts
npm install
npx hardhat compile
npx hardhat test

# Deploy to Sepolia
cp .env.example .env
# Add DEPLOYER_PRIVATE_KEY to .env
npx hardhat ignition deploy ignition/modules/OpenReform.ts --network sepolia
```

### Indexer API (Module B)

```bash
cd indexer-api
npm install
npm run dev      # Development with hot reload
npm run build    # Production build
npm start        # Production server
```

### Environment Variables

**indexer-api/.env:**
```env
PORT=3001
SEPOLIA_RPC_URL=https://ethereum-sepolia-rpc.publicnode.com
CHAIN_ID=11155111
PETITION_REGISTRY_ADDRESS=0x7D377A56642aaE04A883A2f99F876F5b5142399e
ESCROW_MILESTONES_ADDRESS=0x1a7a1e26dc55063f6b485619B7BAa86a222EFd5D
IMPLEMENTER_REGISTRY_ADDRESS=0x5ce5bd6b6E6bDDFC71C1a4d64bc159E28bf909bf
PINATA_API_KEY=your_key
PINATA_SECRET_KEY=your_secret
```

---

## 📁 Project Structure

```
OpenReform/
├── contracts/              # Hardhat + Solidity contracts
│   ├── contracts/          # Smart contract source files
│   ├── ignition/           # Deployment modules
│   └── test/               # Contract tests
├── indexer-api/            # Event indexer + REST API
│   ├── src/
│   │   ├── services/       # IPFS, indexer logic
│   │   ├── routes/         # API endpoints
│   │   └── index.ts        # Server entry
│   └── package.json
├── frontend/               # Next.js dApp (Module C)
├── shared/                 # Shared types, ABIs, constants
│   ├── event-schema.ts     # Event type definitions
│   └── deployed-addresses.json
└── README.md
```

---

## 🎯 Demo Flow

1. **Create Petition** → Upload content to IPFS → Store CID on-chain
2. **Support & Fund** → Multiple wallets support and fund the petition
3. **Accept Implementation** → Implementer accepts with profile CID
4. **Submit Milestones** → Implementer submits proof CIDs
5. **Approve & Payout** → Funders vote, milestone approved, ETH released
6. **Timeline Updates** → All events visible in the dApp

---

## 🔗 Links

- **GitHub**: https://github.com/Hammaduddin561/OpenReform
- **Sepolia Faucet**: https://sepoliafaucet.com/
- **Pinata (IPFS)**: https://pinata.cloud/

---

## 📄 License

MIT License - see [LICENSE](LICENSE) for details.

---

Built with ❤️ for hackathon