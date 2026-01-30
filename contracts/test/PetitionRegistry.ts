import assert from "node:assert/strict";
import { describe, it } from "node:test";
import hre from "hardhat";

const { viem } = await hre.network.connect();

describe("PetitionRegistry", () => {
  it("creates a petition and stores metadata", async () => {
    const petitionRegistry = await viem.deployContract("PetitionRegistry");

    await viem.assertions.emit(
      petitionRegistry.write.createPetition(["cid-1"]),
      petitionRegistry,
      "PetitionCreated",
    );

    const [creator, cid, createdAt, supportCount] = await petitionRegistry.read.getPetition([1n]);
    const [defaultWallet] = await viem.getWalletClients();

    assert.equal(creator.toLowerCase(), defaultWallet.account.address.toLowerCase());
    assert.equal(cid, "cid-1");
    assert.equal(supportCount, 0n);
    assert.ok(createdAt > 0n);
  });

  it("tracks support and prevents double support", async () => {
    const petitionRegistry = await viem.deployContract("PetitionRegistry");
    await petitionRegistry.write.createPetition(["cid-2"]);

    const [, supporter] = await viem.getWalletClients();

    await viem.assertions.emit(
      petitionRegistry.write.support([1n], { account: supporter.account }),
      petitionRegistry,
      "Supported",
    );

    const hasSupported = await petitionRegistry.read.hasSupported([
      1n,
      supporter.account.address,
    ]);
    assert.equal(hasSupported, true);

    const [, , , supportCount] = await petitionRegistry.read.getPetition([1n]);
    assert.equal(supportCount, 1n);

    await viem.assertions.revertWith(
      petitionRegistry.write.support([1n], { account: supporter.account }),
      "ALREADY_SUPPORTED",
    );
  });

  it("reverts support for missing petition", async () => {
    const petitionRegistry = await viem.deployContract("PetitionRegistry");
    const [, supporter] = await viem.getWalletClients();

    await viem.assertions.revertWith(
      petitionRegistry.write.support([999n], { account: supporter.account }),
      "PETITION_NOT_FOUND",
    );
  });
});