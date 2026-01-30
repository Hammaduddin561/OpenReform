import dotenv from 'dotenv';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
dotenv.config();

type DeployedAddresses = {
    petitionRegistry?: string;
    escrowMilestones?: string;
    implementerRegistry?: string;
};

function loadSharedAddresses(): DeployedAddresses {
    try {
        const __filename = fileURLToPath(import.meta.url);
        const __dirname = path.dirname(__filename);
        const sharedPath = path.resolve(__dirname, '..', '..', 'shared', 'deployed-addresses.json');
        if (!fs.existsSync(sharedPath)) return {};
        const raw = fs.readFileSync(sharedPath, 'utf8');
        return JSON.parse(raw) as DeployedAddresses;
    } catch {
        return {};
    }
}

const sharedAddresses = loadSharedAddresses();

export const config = {
    // Server
    port: Number(process.env.PORT) || 3001,

    // Ethereum
    sepoliaRpcUrl: process.env.SEPOLIA_RPC_URL || 'https://ethereum-sepolia-rpc.publicnode.com',
    chainId: Number(process.env.CHAIN_ID) || 11155111,

    // Contract Addresses
    petitionRegistryAddress: process.env.PETITION_REGISTRY_ADDRESS || sharedAddresses.petitionRegistry || '',
    escrowMilestonesAddress: process.env.ESCROW_MILESTONES_ADDRESS || sharedAddresses.escrowMilestones || '',
    implementerRegistryAddress: process.env.IMPLEMENTER_REGISTRY_ADDRESS || sharedAddresses.implementerRegistry || '',

    // IPFS / Pinata
    pinataApiKey: process.env.PINATA_API_KEY || '',
    pinataSecretKey: process.env.PINATA_SECRET_KEY || '',
    pinataGateway: process.env.PINATA_GATEWAY || 'https://gateway.pinata.cloud/ipfs/',

    // Indexer
    indexerStartBlock: Number(process.env.INDEXER_START_BLOCK) || 0,
    indexerPollIntervalMs: Number(process.env.INDEXER_POLL_INTERVAL_MS) || 15000,
    indexerEnableRealtime: process.env.INDEXER_ENABLE_REALTIME === 'true',
};
