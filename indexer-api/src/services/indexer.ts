/**
 * On-Chain Event Indexer
 * Listens to Ethereum Sepolia for contract events and stores them.
 *
 * Supports both real-time event listening and block polling.
 * Falls back to mock mode when contracts are not deployed.
 */

import { ethers } from 'ethers';
import { config } from '../config.js';
import { storeEvent, setLastIndexedBlock, getLastIndexedBlock } from './storage.js';
import type { ContractEvent } from '../../shared/event-schema.js';

// Contract ABIs (events only)
const PETITION_REGISTRY_ABI = [
    'event PetitionCreated(uint256 indexed petitionId, address indexed creator, string contentCID, uint256 timestamp)',
    'event Supported(uint256 indexed petitionId, address indexed supporter, uint256 timestamp)',
];

const ESCROW_MILESTONES_ABI = [
    'event Funded(uint256 indexed petitionId, address indexed funder, uint256 amount, uint256 timestamp)',
    'event ImplementerAccepted(uint256 indexed petitionId, address indexed implementer, string profileCID, uint256 timestamp)',
    'event MilestoneSubmitted(uint256 indexed petitionId, uint256 milestoneIndex, string proofCID, uint256 timestamp)',
    'event MilestoneApproved(uint256 indexed petitionId, uint256 milestoneIndex, address indexed approver, uint256 timestamp)',
    'event PayoutReleased(uint256 indexed petitionId, uint256 milestoneIndex, uint256 amount, address indexed implementer, uint256 timestamp)',
    'event RefundsClaimed(uint256 indexed petitionId, address indexed claimant, uint256 amount, uint256 timestamp)',
];

let provider: ethers.JsonRpcProvider | null = null;
let isRunning = false;
let pollInterval: NodeJS.Timer | null = null;

export function isIndexerRunning(): boolean {
    return isRunning;
}

export function getProvider(): ethers.JsonRpcProvider {
    if (!provider) {
        provider = new ethers.JsonRpcProvider(config.sepoliaRpcUrl);
    }
    return provider;
}

// Check if contracts are configured
function areContractsConfigured(): boolean {
    return !!(config.petitionRegistryAddress && config.escrowMilestonesAddress);
}

// Start the indexer
export async function startIndexer(): Promise<void> {
    if (isRunning) {
        console.log('[Indexer] Already running');
        return;
    }

    console.log('[Indexer] Starting...');

    if (!areContractsConfigured()) {
        console.log('[Indexer] Contracts not configured - running in mock mode');
        console.log('[Indexer] Set contract addresses in .env when Module A deploys');
        isRunning = true;
        return;
    }

    try {
        const p = getProvider();
        const currentBlock = await p.getBlockNumber();
        console.log(`[Indexer] Connected to Sepolia, current block: ${currentBlock}`);

        if (getLastIndexedBlock() === 0 && config.indexerStartBlock > 0) {
            setLastIndexedBlock(config.indexerStartBlock);
        }

        // Set up event listeners for each contract
        await setupContractListeners();

        // Start polling for past events
        await catchUpFromLastBlock();

        // Start periodic polling
        pollInterval = setInterval(pollForEvents, config.indexerPollIntervalMs);

        isRunning = true;
        console.log('[Indexer] Started successfully');
    } catch (error) {
        console.error('[Indexer] Failed to start:', error);
        throw error;
    }
}

// Stop the indexer
export function stopIndexer(): void {
    if (pollInterval) {
        clearInterval(pollInterval);
        pollInterval = null;
    }
    isRunning = false;
    console.log('[Indexer] Stopped');
}

function getEventMeta(event: any): { blockNumber: number; txHash: string } {
    const blockNumber = event.log?.blockNumber ?? event.blockNumber ?? 0;
    const txHash = event.log?.transactionHash ?? event.transactionHash ?? '';
    return { blockNumber, txHash };
}

// Set up real-time event listeners
async function setupContractListeners(): Promise<void> {
    const p = getProvider();

    if (config.petitionRegistryAddress) {
        const petitionRegistry = new ethers.Contract(
            config.petitionRegistryAddress,
            PETITION_REGISTRY_ABI,
            p,
        );

        petitionRegistry.on('PetitionCreated', (petitionId, creator, contentCID, timestamp, event) => {
            const meta = getEventMeta(event);
            handleEvent('PetitionCreated', {
                petitionId: petitionId.toString(),
                creator,
                contentCID,
                timestamp: Number(timestamp),
                blockNumber: meta.blockNumber,
                txHash: meta.txHash,
            });
        });

        petitionRegistry.on('Supported', (petitionId, supporter, timestamp, event) => {
            const meta = getEventMeta(event);
            handleEvent('Supported', {
                petitionId: petitionId.toString(),
                supporter,
                timestamp: Number(timestamp),
                blockNumber: meta.blockNumber,
                txHash: meta.txHash,
            });
        });
    }

    if (config.escrowMilestonesAddress) {
        const escrowMilestones = new ethers.Contract(
            config.escrowMilestonesAddress,
            ESCROW_MILESTONES_ABI,
            p,
        );

        escrowMilestones.on('Funded', (petitionId, funder, amount, timestamp, event) => {
            const meta = getEventMeta(event);
            handleEvent('Funded', {
                petitionId: petitionId.toString(),
                funder,
                amount: amount.toString(),
                timestamp: Number(timestamp),
                blockNumber: meta.blockNumber,
                txHash: meta.txHash,
            });
        });

        escrowMilestones.on('ImplementerAccepted', (petitionId, implementer, profileCID, timestamp, event) => {
            const meta = getEventMeta(event);
            handleEvent('ImplementerAccepted', {
                petitionId: petitionId.toString(),
                implementer,
                profileCID,
                timestamp: Number(timestamp),
                blockNumber: meta.blockNumber,
                txHash: meta.txHash,
            });
        });

        escrowMilestones.on('MilestoneSubmitted', (petitionId, milestoneIndex, proofCID, timestamp, event) => {
            const meta = getEventMeta(event);
            handleEvent('MilestoneSubmitted', {
                petitionId: petitionId.toString(),
                milestoneIndex: Number(milestoneIndex),
                proofCID,
                timestamp: Number(timestamp),
                blockNumber: meta.blockNumber,
                txHash: meta.txHash,
            });
        });

        escrowMilestones.on('MilestoneApproved', (petitionId, milestoneIndex, approver, timestamp, event) => {
            const meta = getEventMeta(event);
            handleEvent('MilestoneApproved', {
                petitionId: petitionId.toString(),
                milestoneIndex: Number(milestoneIndex),
                approver,
                timestamp: Number(timestamp),
                blockNumber: meta.blockNumber,
                txHash: meta.txHash,
            });
        });

        escrowMilestones.on('PayoutReleased', (petitionId, milestoneIndex, amount, implementer, timestamp, event) => {
            const meta = getEventMeta(event);
            handleEvent('PayoutReleased', {
                petitionId: petitionId.toString(),
                milestoneIndex: Number(milestoneIndex),
                amount: amount.toString(),
                implementer,
                timestamp: Number(timestamp),
                blockNumber: meta.blockNumber,
                txHash: meta.txHash,
            });
        });

        escrowMilestones.on('RefundsClaimed', (petitionId, claimant, amount, timestamp, event) => {
            const meta = getEventMeta(event);
            handleEvent('RefundsClaimed', {
                petitionId: petitionId.toString(),
                claimant,
                amount: amount.toString(),
                timestamp: Number(timestamp),
                blockNumber: meta.blockNumber,
                txHash: meta.txHash,
            });
        });
    }

    console.log('[Indexer] Event listeners set up');
}

// Handle an incoming event
function handleEvent(type: string, data: Record<string, unknown>): void {
    const event: ContractEvent = {
        type,
        ...data,
    } as unknown as ContractEvent;

    console.log(`[Indexer] Event received: ${type} for petition ${data.petitionId}`);
    storeEvent(event);
}

// Catch up from last indexed block
async function catchUpFromLastBlock(): Promise<void> {
    const lastBlock = getLastIndexedBlock();
    const p = getProvider();
    const currentBlock = await p.getBlockNumber();

    if (lastBlock >= currentBlock) return;

    console.log(`[Indexer] Catching up from block ${lastBlock} to ${currentBlock}`);

    // Query events in chunks
    const CHUNK_SIZE = 1000;
    for (let from = lastBlock; from <= currentBlock; from += CHUNK_SIZE) {
        const to = Math.min(from + CHUNK_SIZE - 1, currentBlock);
        await queryEventRange(from, to);
    }

    setLastIndexedBlock(currentBlock);
    console.log(`[Indexer] Caught up to block ${currentBlock}`);
}

// Poll for new events
async function pollForEvents(): Promise<void> {
    if (!areContractsConfigured()) return;

    try {
        const p = getProvider();
        const lastBlock = getLastIndexedBlock();
        const currentBlock = await p.getBlockNumber();

        if (currentBlock > lastBlock) {
            await queryEventRange(lastBlock + 1, currentBlock);
            setLastIndexedBlock(currentBlock);
        }
    } catch (error) {
        console.error('[Indexer] Poll error:', error);
    }
}

async function queryPetitionRegistry(fromBlock: number, toBlock: number): Promise<void> {
    if (!config.petitionRegistryAddress) return;
    const contract = new ethers.Contract(config.petitionRegistryAddress, PETITION_REGISTRY_ABI, getProvider());

    const created = await contract.queryFilter(contract.filters.PetitionCreated(), fromBlock, toBlock);
    for (const event of created) {
        const args = event.args;
        if (!args) continue;
        handleEvent('PetitionCreated', {
            petitionId: args.petitionId.toString(),
            creator: args.creator,
            contentCID: args.contentCID,
            timestamp: Number(args.timestamp),
            blockNumber: event.blockNumber,
            txHash: event.transactionHash,
        });
    }

    const supported = await contract.queryFilter(contract.filters.Supported(), fromBlock, toBlock);
    for (const event of supported) {
        const args = event.args;
        if (!args) continue;
        handleEvent('Supported', {
            petitionId: args.petitionId.toString(),
            supporter: args.supporter,
            timestamp: Number(args.timestamp),
            blockNumber: event.blockNumber,
            txHash: event.transactionHash,
        });
    }
}

async function queryEscrowMilestones(fromBlock: number, toBlock: number): Promise<void> {
    if (!config.escrowMilestonesAddress) return;
    const contract = new ethers.Contract(config.escrowMilestonesAddress, ESCROW_MILESTONES_ABI, getProvider());

    const funded = await contract.queryFilter(contract.filters.Funded(), fromBlock, toBlock);
    for (const event of funded) {
        const args = event.args;
        if (!args) continue;
        handleEvent('Funded', {
            petitionId: args.petitionId.toString(),
            funder: args.funder,
            amount: args.amount.toString(),
            timestamp: Number(args.timestamp),
            blockNumber: event.blockNumber,
            txHash: event.transactionHash,
        });
    }

    const accepted = await contract.queryFilter(contract.filters.ImplementerAccepted(), fromBlock, toBlock);
    for (const event of accepted) {
        const args = event.args;
        if (!args) continue;
        handleEvent('ImplementerAccepted', {
            petitionId: args.petitionId.toString(),
            implementer: args.implementer,
            profileCID: args.profileCID,
            timestamp: Number(args.timestamp),
            blockNumber: event.blockNumber,
            txHash: event.transactionHash,
        });
    }

    const submitted = await contract.queryFilter(contract.filters.MilestoneSubmitted(), fromBlock, toBlock);
    for (const event of submitted) {
        const args = event.args;
        if (!args) continue;
        handleEvent('MilestoneSubmitted', {
            petitionId: args.petitionId.toString(),
            milestoneIndex: Number(args.milestoneIndex),
            proofCID: args.proofCID,
            timestamp: Number(args.timestamp),
            blockNumber: event.blockNumber,
            txHash: event.transactionHash,
        });
    }

    const approved = await contract.queryFilter(contract.filters.MilestoneApproved(), fromBlock, toBlock);
    for (const event of approved) {
        const args = event.args;
        if (!args) continue;
        handleEvent('MilestoneApproved', {
            petitionId: args.petitionId.toString(),
            milestoneIndex: Number(args.milestoneIndex),
            approver: args.approver,
            timestamp: Number(args.timestamp),
            blockNumber: event.blockNumber,
            txHash: event.transactionHash,
        });
    }

    const payouts = await contract.queryFilter(contract.filters.PayoutReleased(), fromBlock, toBlock);
    for (const event of payouts) {
        const args = event.args;
        if (!args) continue;
        handleEvent('PayoutReleased', {
            petitionId: args.petitionId.toString(),
            milestoneIndex: Number(args.milestoneIndex),
            amount: args.amount.toString(),
            implementer: args.implementer,
            timestamp: Number(args.timestamp),
            blockNumber: event.blockNumber,
            txHash: event.transactionHash,
        });
    }

    const refunds = await contract.queryFilter(contract.filters.RefundsClaimed(), fromBlock, toBlock);
    for (const event of refunds) {
        const args = event.args;
        if (!args) continue;
        handleEvent('RefundsClaimed', {
            petitionId: args.petitionId.toString(),
            claimant: args.claimant,
            amount: args.amount.toString(),
            timestamp: Number(args.timestamp),
            blockNumber: event.blockNumber,
            txHash: event.transactionHash,
        });
    }
}

// Query events in a block range
async function queryEventRange(fromBlock: number, toBlock: number): Promise<void> {
    if (!areContractsConfigured()) return;

    try {
        await queryPetitionRegistry(fromBlock, toBlock);
        await queryEscrowMilestones(fromBlock, toBlock);
    } catch (error) {
        console.error('[Indexer] Error querying events:', error);
    }
}

// Get current indexer stats
export function getIndexerStats(): {
    running: boolean;
    lastBlock: number;
    configured: boolean;
} {
    return {
        running: isRunning,
        lastBlock: getLastIndexedBlock(),
        configured: areContractsConfigured(),
    };
}
