require("dotenv").config();
const { ethers } = require("ethers");
const fs = require("fs");
const path = require("path");

async function main() {
    console.log("🚀 Seeding Petition via Standalone Script...");

    // 1. Setup Provider & Wallet
    // Fix keys if corrupted
    const RPC_URL = process.env.SEPOLIA_RPC_URL || "https://ethereum-sepolia-rpc.publicnode.com";
    const PRIVATE_KEY = process.env.DEPLOYER_PRIVATE_KEY;
    if (!PRIVATE_KEY) throw new Error("Missing DEPLOYER_PRIVATE_KEY in .env");

    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
    console.log(`Wallet: ${wallet.address}`);

    // 2. Get Address & ABI
    const deployPath = path.join(__dirname, "..", "shared", "deployed-addresses.json");
    const deployed = require(deployPath);
    const address = deployed["petitionRegistry"] || deployed["OpenReform#PetitionRegistry"];

    const artifactPath = path.join(__dirname, "ignition", "deployments", "chain-11155111", "artifacts", "OpenReform#PetitionRegistry.json");
    const artifact = require(artifactPath);

    // 3. Connect Contract
    const contract = new ethers.Contract(address, artifact.abi, wallet);

    // 4. Send Transaction
    const dummyCID = "QmTeW79w7QQ6Npa3b1d5tANreCDxk2HghtKJDjQ7d1y91X";
    console.log(`Creating petition on contract: ${address}...`);

    try {
        const tx = await contract.createPetition(dummyCID);
        console.log(`Tx Sent! Hash: ${tx.hash}`);
        console.log("Waiting for confirmation...");
        await tx.wait();
        console.log("✅ Petition verified on-chain!");
    } catch (err) {
        console.error("Tx Failed:", err);
    }
}

main().catch(console.error);
