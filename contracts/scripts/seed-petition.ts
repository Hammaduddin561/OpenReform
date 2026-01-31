import { ethers } from "hardhat";
import fs from "fs";
import path from "path";

async function main() {
    console.log("🚀 Creating TEST PETITION on Sepolia (Ethers)...");

    // 1. Get contract address
    const addressPath = path.join(__dirname, "..", "..", "shared", "deployed-addresses.json");
    if (!fs.existsSync(addressPath)) {
        throw new Error(`Address file not found at ${addressPath}`);
    }
    const deployedAddresses = JSON.parse(fs.readFileSync(addressPath, "utf8"));
    const petitionRegistryAddress = deployedAddresses.petitionRegistry || deployedAddresses["OpenReform#PetitionRegistry"];

    if (!petitionRegistryAddress) {
        throw new Error("PetitionRegistry address not found!");
    }
    console.log(`Contract: ${petitionRegistryAddress}`);

    // 2. Setup Ethers
    const [signer] = await ethers.getSigners();
    console.log(`Signer: ${signer.address}`);

    // 3. Create Petition
    const PetitionRegistry = await ethers.getContractFactory("PetitionRegistry");
    const petitionRegistry = PetitionRegistry.attach(petitionRegistryAddress);

    const dummyCID = "QmTeW79w7QQ6Npa3b1d5tANreCDxk2HghtKJDjQ7d1y91X";

    console.log("Sending transaction...");
    const tx = await petitionRegistry.createPetition(dummyCID);
    console.log(`Tx sent: ${tx.hash}`);

    console.log("Waiting for confirmation...");
    await tx.wait();

    console.log("✅ Petition Created successfully!");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("❌ Script failed:", error);
        process.exit(1);
    });
