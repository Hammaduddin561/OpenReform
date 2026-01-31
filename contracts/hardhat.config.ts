import "dotenv/config";
import "@nomicfoundation/hardhat-toolbox-viem"; // Keep this if project uses it
import "@nomicfoundation/hardhat-ethers"; // Add this back
import { defineConfig } from "hardhat/config";

export default defineConfig({
  solidity: {
    version: "0.8.29",
  },
  networks: {
    sepolia: {
      type: "http",
      url: process.env.SEPOLIA_RPC_URL || "https://ethereum-sepolia-rpc.publicnode.com",
      accounts: process.env.DEPLOYER_PRIVATE_KEY ? [process.env.DEPLOYER_PRIVATE_KEY] : [],
      chainId: 11155111,
    },
  },
});