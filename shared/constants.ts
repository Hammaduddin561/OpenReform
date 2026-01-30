/**
 * Shared Constants for OpenReform Platform
 * These values are used by frontend, indexer, and contracts.
 */

import deployedAddresses from "./deployed-addresses.json";

// ===== Chain Configuration =====
export const CHAIN_ID = 11155111; // Sepolia testnet
export const CHAIN_NAME = 'Sepolia';

// ===== Contract Addresses =====
// TODO: Update these after Module A deploys contracts
const defaultAddresses = deployedAddresses ?? {
    petitionRegistry: "",
    escrowMilestones: "",
    implementerRegistry: "",
};

export const CONTRACT_ADDRESSES = {
    petitionRegistry: process.env.PETITION_REGISTRY_ADDRESS || defaultAddresses.petitionRegistry || "",
    escrowMilestones: process.env.ESCROW_MILESTONES_ADDRESS || defaultAddresses.escrowMilestones || "",
    implementerRegistry: process.env.IMPLEMENTER_REGISTRY_ADDRESS || defaultAddresses.implementerRegistry || "",
};

// ===== RPC URLs =====
export const RPC_URLS = {
    sepolia: 'https://ethereum-sepolia-rpc.publicnode.com',
    sepoliaAlternates: [
        'https://rpc.sepolia.org',
        'https://sepolia.drpc.org',
    ],
};

// ===== IPFS Configuration =====
export const IPFS_CONFIG = {
    gateway: process.env.PINATA_GATEWAY || 'https://gateway.pinata.cloud/ipfs/',
    gatewayAlternates: [
        'https://ipfs.io/ipfs/',
        'https://dweb.link/ipfs/',
    ],
};

// ===== API Configuration =====
export const API_CONFIG = {
    port: Number(process.env.PORT) || 3001,
    corsOrigins: ['http://localhost:3000', 'http://localhost:3001'],
};

// ===== Indexer Configuration =====
export const INDEXER_CONFIG = {
    pollIntervalMs: Number(process.env.INDEXER_POLL_INTERVAL_MS) || 15000,
    startBlock: Number(process.env.INDEXER_START_BLOCK) || 0,
    maxBlocksPerQuery: 1000,
};
