# Decentralized Petition-to-Action Platform — 36h Hackathon Plan

## 1) Project Summary
A decentralized petition-to-action platform on Ethereum testnet (prefer Sepolia) that lets supporters fund petitions into escrow with milestone-based payouts to implementers. Petition content and proofs live on IPFS, and an indexer-driven timeline shows progress from creation to payouts.

## 2) High-level Demo Story (2–3 minutes)
Create a petition with IPFS-hosted content and on-chain CID, support and fund it from multiple wallets, an implementer accepts and submits milestone proofs, an attestor approves and releases escrowed payouts, and the UI timeline updates via the indexer API (fallback to direct chain reads if needed).

## 3) Repo / Folder Structure
```
/contracts          # Hardhat project, Solidity, tests, deployment scripts
/indexer-api        # Event indexer + API + IPFS pinning helpers
/frontend           # Next.js dApp using wagmi + viem
/shared             # Shared ABIs, types, constants, event schemas
```

## 4) Module Breakdown (3 equal parts)

### Module A: Ethereum Smart Contracts (Hardhat)
Objective: Build minimal contracts for petitions, escrow + milestones, implementers, and approvals, with events required by the indexer and UI.

Scope
- MVP must-have: Petition creation (CID stored), support (no double support), ETH-only funding in escrow, implementer acceptance, milestones + proof CID submission, on-chain vote approval, milestone payout, refunds if deadline not met.
- Nice-to-have: Stake/reputation counters, petition threshold rules, multi-attestor approval.

Milestones (very granular)

1) Task: Initialize Hardhat project in `/contracts`.
   - Output/Deliverable: Hardhat scaffold committed.
   - Verification/Acceptance: `npx hardhat --version` and `npx hardhat compile` succeed.
   - Time estimate: 30–45 min
   - Dependencies: Verify Hardhat setup steps from official docs.

2) Task: Define core data model (structs/enums) and events in Solidity.
   - Output/Deliverable: `contracts/` with event declarations for PetitionCreated, Supported, Funded, ImplementerAccepted, MilestoneSubmitted, MilestoneApproved, PayoutReleased, RefundsClaimed.
   - Verification/Acceptance: `npx hardhat compile` succeeds; event names and args documented in `/shared` stub.
   - Time estimate: 45–60 min
   - Dependencies: Align with Module B event indexer needs.

3) Task: Implement PetitionRegistry (create petition with CID, status).
   - Output/Deliverable: `PetitionRegistry.sol` with create + getter(s).
   - Verification/Acceptance: Unit tests show create emits PetitionCreated with CID and creator.
   - Time estimate: 60–90 min
   - Dependencies: Data model from Milestone 2.

4) Task: Implement support logic (prevent double-support).
   - Output/Deliverable: Support function + mapping for supporters.
   - Verification/Acceptance: Tests confirm duplicate support reverts and Supported event emits once.
   - Time estimate: 60 min
   - Dependencies: PetitionRegistry.

5) Task: Implement Escrow/Milestones contract (funding + deadlines).
   - Output/Deliverable: `EscrowMilestones.sol` with funding, refund eligibility, milestone payouts.
   - Verification/Acceptance: Tests confirm funding emits Funded, deadline triggers refundable status, refund works.
   - Time estimate: 2–3 h
   - Dependencies: PetitionRegistry ID and status.

6) Task: Implement ImplementerRegistry (profile CID, acceptance).
   - Output/Deliverable: `ImplementerRegistry.sol` with profile registration + accept petition.
   - Verification/Acceptance: Tests show ImplementerAccepted event and profile CID stored.
   - Time estimate: 60–90 min
   - Dependencies: PetitionRegistry + EscrowMilestones linkage.

7) Task: Implement approval voting for milestone proofs (simple on-chain vote).
   - Output/Deliverable: Approval mechanism to approve milestone proofs via on-chain vote with the MVP rules in Section 9.
   - Verification/Acceptance: Tests show MilestoneApproved triggers payout when vote passes.
   - Time estimate: 90–120 min
   - Dependencies: Milestone submission flow in EscrowMilestones.

8) Task: Write deployment script for Sepolia testnet.
   - Output/Deliverable: Hardhat deploy script(s) and env variables list.
   - Verification/Acceptance: Dry-run or local deploy; ensure address outputs saved to `/shared/constants`.
   - Time estimate: 60–90 min
   - Dependencies: Contract compilation success.

9) Task: ABI export to `/shared`.
   - Output/Deliverable: ABI JSON files in `/shared/abis`.
   - Verification/Acceptance: Frontend can import ABIs without manual copying.
   - Time estimate: 30–45 min
   - Dependencies: Compilation artifacts.

### Module B: Indexer + API + IPFS Pinning (Backend)
Objective: Provide event timeline API and pinning workflow for petition content and milestone proofs.

Scope
- MVP must-have: Event indexer for required contract events; REST API for timeline and petition metadata; IPFS pinning helper storing CID mapping.
- Nice-to-have: Webhook-based pinning callbacks, caching, pagination.

Milestones (very granular)

1) Task: Scaffold `/indexer-api` project (Node.js).
   - Output/Deliverable: Basic server structure + config.
   - Verification/Acceptance: `npm run dev` (or equivalent) starts server.
   - Time estimate: 45–60 min
   - Dependencies: Choose framework (verify official docs).

2) Task: Define event ingestion format and storage (in-memory or simple DB).
   - Output/Deliverable: Event schema in `/shared/event-schema`.
   - Verification/Acceptance: Sample event can be stored and retrieved.
   - Time estimate: 60 min
   - Dependencies: Module A event list.

3) Task: Implement on-chain event sync (polling or provider logs).
   - Output/Deliverable: Indexer that reads events from Sepolia.
   - Verification/Acceptance: Running indexer logs events from a local test deployment or Sepolia.
   - Time estimate: 2–3 h
   - Dependencies: ABI + contract addresses.

4) Task: Implement IPFS pinning helper (provider SDK).
   - Output/Deliverable: `/indexer-api/ipfs/` helper with upload function returning CID.
   - Verification/Acceptance: Test upload returns CID and content retrievable via gateway.
   - Time estimate: 1–2 h
   - Dependencies: Provider selection + official docs.

5) Task: Build REST API endpoints for timeline + petition metadata.
   - Output/Deliverable: `/api/petitions/:id/timeline`, `/api/petitions/:id`, `/api/petitions`.
   - Verification/Acceptance: API returns deterministic JSON schema for frontend.
   - Time estimate: 2 h
   - Dependencies: Event storage layer + event schema.

6) Task: Add fallback endpoint to expose raw events (for debugging).
   - Output/Deliverable: `/api/events/raw`.
   - Verification/Acceptance: Endpoint returns last N events.
   - Time estimate: 45–60 min
   - Dependencies: Event ingestion.

7) Task: Document API schema in `/shared/api-schema.md`.
   - Output/Deliverable: Shared schema for frontend integration.
   - Verification/Acceptance: Frontend dev can implement without guessing.
   - Time estimate: 30–45 min
   - Dependencies: Routes finalized.

### Module C: Frontend dApp (Next.js + wagmi + viem)
Objective: Build petition creation, support/funding, implementer flow, milestone proof submission, and timeline UI.

Scope
- MVP must-have: Wallet connect, petition create (IPFS pin + on-chain), support + fund, implementer accept, submit milestone proof, attestor approve, timeline view.
- Nice-to-have: Search/filter, user profiles, rich markdown rendering.

Milestones (very granular)

1) Task: Scaffold Next.js app in `/frontend`.
   - Output/Deliverable: Next.js app running locally.
   - Verification/Acceptance: `npm run dev` shows default page.
   - Time estimate: 45–60 min
   - Dependencies: Verify latest Next.js setup docs.

2) Task: Integrate wallet connection via wagmi + viem.
   - Output/Deliverable: Wallet connect UI + chain config (Sepolia).
   - Verification/Acceptance: User can connect and see address.
   - Time estimate: 1–2 h
   - Dependencies: Official wagmi/viem docs.

3) Task: Petition creation flow (IPFS + on-chain).
   - Output/Deliverable: Create form, IPFS upload, call create function.
   - Verification/Acceptance: PetitionCreated event visible and UI shows new petition.
   - Time estimate: 2–3 h
   - Dependencies: IPFS helper endpoint + contract ABI.

4) Task: Support + funding flow (ETH escrow).
   - Output/Deliverable: Support + fund buttons, show balances.
   - Verification/Acceptance: Supported and Funded events appear in timeline.
   - Time estimate: 2 h
   - Dependencies: Contract functions + event indexer API.

5) Task: Implementer acceptance + profile.
   - Output/Deliverable: Profile CID upload + accept petition.
   - Verification/Acceptance: ImplementerAccepted event shows in timeline.
   - Time estimate: 1–2 h
   - Dependencies: ImplementerRegistry ABI + IPFS helper.

6) Task: Milestone proof submission + approval UI.
   - Output/Deliverable: Submit proof CID; attestor approve; payout status.
   - Verification/Acceptance: MilestoneSubmitted/MilestoneApproved/PayoutReleased events appear.
   - Time estimate: 2–3 h
   - Dependencies: Approval mechanism + contracts.

7) Task: Timeline UI (from indexer API; fallback direct chain reads).
   - Output/Deliverable: Petition timeline view with event list.
   - Verification/Acceptance: Timeline updates after each action.
   - Time estimate: 2 h
   - Dependencies: Indexer API schema.

8) Task: Add "Minimum Demo Path" page.
   - Output/Deliverable: Single guided page to drive demo flow.
   - Verification/Acceptance: End-to-end demo works in <3 min.
   - Time estimate: 60–90 min
   - Dependencies: All core features.

## 5) Integration Contracts

### Smart Contract Events (required by indexer)
Event names and fields to finalize in contracts and `/shared/event-schema`:
- PetitionCreated(petitionId, creator, contentCID, timestamp)
- Supported(petitionId, supporter, timestamp)
- Funded(petitionId, funder, amount, timestamp)
- ImplementerAccepted(petitionId, implementer, profileCID, timestamp)
- MilestoneSubmitted(petitionId, milestoneIndex, proofCID, timestamp)
- MilestoneApproved(petitionId, milestoneIndex, approver, timestamp)
- PayoutReleased(petitionId, milestoneIndex, amount, implementer, timestamp)
- RefundsClaimed(petitionId, claimant, amount, timestamp)

Note: Exact event signatures must be confirmed against contract implementation.

### ABI Sharing Procedure
- Compile artifacts in `/contracts`.
- Export ABI JSON to `/shared/abis`.
- Frontend and indexer import ABIs from `/shared/abis`.
- Update ABIs on each contract change; verify by re-running compile.

### API Endpoints Required by Frontend
- `GET /api/petitions` → list of petitions
  - fields: petitionId, title, contentCID, status, totalFunded, supporterCount, timestamps
- `GET /api/petitions/:id` → petition detail
  - fields: petitionId, contentCID, status, milestones[], implementer, fundingStatus
- `GET /api/petitions/:id/timeline` → ordered events
  - fields: type, petitionId, actor, amount, cid, timestamp, txHash
- `POST /api/ipfs/pin` → pin content/proof
  - fields: cid (return), provider, timestamp

Note: Exact response fields must be verified and aligned with frontend needs.

### Shared Constants
- `chainId` (Sepolia) — verify from official Ethereum docs.
- Contract addresses — set after deployment, stored in `/shared/constants`.
- IPFS gateway pattern — choose provider gateway and verify docs.

## 6) Timeline Plan (36 hours)

### 0–6h
- Person A (Contracts): Hardhat init, core events + PetitionRegistry, support logic.
- Person B (Indexer/API): Scaffold API, event schema, storage layer.
- Person C (Frontend): Next.js scaffold, wallet connect, basic layout.

Integration checkpoint: Event schema draft in `/shared`.

### 6–12h
- Person A: Escrow/Milestones funding + refund logic + tests.
- Person B: Event sync from chain; initial API endpoints.
- Person C: Petition create flow (IPFS pin + on-chain).

Integration checkpoint: PetitionCreated visible in UI and API.

### 12–24h
- Person A: Implementer registry + acceptance + approval flow + tests.
- Person B: IPFS pinning helper; timeline endpoint.
- Person C: Support + fund UI + implementer acceptance UI.

Integration checkpoint: Supported/Funded/ImplementerAccepted show in timeline.

### 24–30h
- Person A: Milestone submission + approval + payout events.
- Person B: Raw events endpoint + schema docs in `/shared`.
- Person C: Milestone submit/approve UI + payout status.

Integration checkpoint: MilestoneSubmitted/Approved/PayoutReleased shown.

### 30–36h
- All: End-to-end demo polish, minimum demo page, fallback modes.
- Person A: Deploy to Sepolia, update `/shared/constants`.
- Person B: Stabilize indexer; fallback instructions.
- Person C: Demo script and UI polish.

Final checkpoint: 2–3 minute demo success.

## 7) Security + Safety Checklist (MVP-level)
- Escrow safety: Use reentrancy guards where applicable; prefer pull payments; enforce access control for approvals.
- Access control: Attestor/admin restricted to approvals; implementer restrictions for milestone submissions.
- Key handling: Use `.env` for private keys; never commit secrets.
- Content moderation stance: No deletion; optionally hide content in UI via visibility gating for hackathon demo.

## 8) Risk Register + Fallbacks
- IPFS pinning fails: Fallback to local JSON + hashes; display as unverified.
- Indexer unstable: Fallback to frontend direct event reads.
- On-chain voting too complex to stabilize in time: Fallback to single admin attestor for milestone approvals (only if needed for demo).

## 9) Questions / Decisions Needed
No open questions. Decisions locked for MVP:
- Token choice: ETH-only escrow.
- Thresholds: No minimum thresholds; support is a signal and funding can start immediately.
- Approval model: On-chain voting for milestone approvals.
- Voter eligibility: Funders of the petition.
- Vote weight: 1 address = 1 vote (no funding-weighted votes for MVP).
- Passing rule: Simple majority of votes cast within the voting window; no quorum.
- Voting window: 24 hours from milestone proof submission.
- Tie/low participation: Treat as failed; implementer may resubmit proof once.
- IPFS pinning provider: Pinata (verify latest API and auth flow in official docs).
- Hackathon constraints: None reported.
- Any hackathon constraints discovered in official docs (RPC limits, demo requirements)?
- IPFS pinning provider selection (Pinata vs web3.storage vs others)?

## 10) References to verify (official)
- Find official Hardhat docs link.
- Find official OpenZeppelin contracts docs link.
- Find official wagmi docs link.
- Find official viem docs link.
- Find official Ethereum Sepolia docs + faucet info.
- Find official IPFS pinning provider docs (Pinata / web3.storage / others).
- Find official hackathon rules/track requirements (HackJNU/Devfolio or relevant).
