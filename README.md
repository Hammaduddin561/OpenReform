# 🗳️ OpenReform

**A Decentralized Petition-to-Action Platform on Ethereum**

OpenReform enables supporters to fund petitions into escrow with milestone-based payouts to implementers. Petition content and proofs live on IPFS, and an indexer-driven timeline shows progress from creation to payouts.

![Ethereum](https://img.shields.io/badge/Ethereum-Sepolia-blueviolet)
![Solidity](https://img.shields.io/badge/Solidity-0.8.29-blue)
![Node.js](https://img.shields.io/badge/Node.js-20+-green)
![License](https://img.shields.io/badge/License-MIT-yellow)

---

## 🏗️ System Architecture

```mermaid
flowchart TB
    subgraph Frontend["🖥️ Frontend (Module C)"]
        UI[Next.js dApp]
        Wallet[wagmi + viem]
    end

    subgraph Indexer["⚙️ Indexer API (Module B)"]
        API[REST API<br/>Port 3001]
        IDX[Event Indexer]
        IPFS[IPFS Pinning<br/>Pinata]
    end

    subgraph Blockchain["⛓️ Ethereum Sepolia"]
        PR[PetitionRegistry]
        IR[ImplementerRegistry]
        EM[EscrowMilestones]
    end

    subgraph Storage["📦 IPFS Network"]
        Content[Petition Content]
        Proofs[Milestone Proofs]
    end

    UI --> Wallet
    Wallet --> PR & IR & EM
    UI --> API
    API --> IPFS
    IPFS --> Content & Proofs
    IDX --> PR & IR & EM
    PR & IR & EM --> IDX
```

---

## 🔄 Data Flow

```mermaid
sequenceDiagram
    participant User
    participant Frontend
    participant API as Indexer API
    participant IPFS
    participant SC as Smart Contracts

    Note over User,SC: Create Petition Flow
    User->>Frontend: Create petition
    Frontend->>API: POST /api/ipfs/pin
    API->>IPFS: Pin content
    IPFS-->>API: Return CID
    API-->>Frontend: Return CID + gateway
    Frontend->>SC: createPetition(CID)
    SC-->>Frontend: PetitionCreated event

    Note over User,SC: Support & Fund Flow
    User->>Frontend: Support + Fund
    Frontend->>SC: support() + fund()
    SC-->>API: Supported + Funded events
    API-->>Frontend: GET /timeline updates

    Note over User,SC: Implementation Flow
    User->>SC: acceptImplementer()
    User->>API: POST /api/ipfs/pin (proof)
    User->>SC: submitMilestone(proofCID)
    SC-->>API: Events indexed
```

---

## 📊 Contract Interactions

```mermaid
flowchart LR
    subgraph Contracts
        PR[PetitionRegistry]
        IR[ImplementerRegistry]
        EM[EscrowMilestones]
    end

    PR --> |getPetition| EM
    IR --> |getProfile| EM
    
    U1((Creator)) --> |createPetition| PR
    U2((Supporter)) --> |support| PR
    U3((Funder)) --> |fund| EM
    U4((Implementer)) --> |setProfile| IR
    U4 --> |acceptImplementer| EM
    U4 --> |submitMilestone| EM
    U5((Voters)) --> |voteOnMilestone| EM
    U5 --> |finalizeMilestone| EM
```

---

## 🎯 Petition Lifecycle

```mermaid
stateDiagram-v2
    [*] --> Created: createPetition()
    Created --> Active: support() / fund()
    Active --> Accepted: acceptImplementer()
    Accepted --> InProgress: submitMilestone()
    InProgress --> InProgress: More milestones
    InProgress --> Completed: All milestones approved
    Active --> Refunded: Deadline passed
    Completed --> [*]
    Refunded --> [*]
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

```mermaid
flowchart LR
    subgraph Events
        E1[PetitionCreated]
        E2[Supported]
        E3[Funded]
        E4[ImplementerAccepted]
        E5[MilestoneSubmitted]
        E6[MilestoneApproved]
        E7[PayoutReleased]
        E8[RefundsClaimed]
    end

    E1 --> IDX[Indexer]
    E2 --> IDX
    E3 --> IDX
    E4 --> IDX
    E5 --> IDX
    E6 --> IDX
    E7 --> IDX
    E8 --> IDX
    IDX --> API[REST API]
    API --> FE[Frontend]
```

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

## 🔗 Links

- **GitHub**: https://github.com/Hammaduddin561/OpenReform
- **Sepolia Faucet**: https://sepoliafaucet.com/
- **Pinata (IPFS)**: https://pinata.cloud/

---

## 📄 License

MIT License - see [LICENSE](LICENSE) for details.

---

Built with ❤️ for hackathon