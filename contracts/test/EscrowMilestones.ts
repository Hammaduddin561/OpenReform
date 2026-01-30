import assert from "node:assert/strict";
import { describe, it } from "node:test";
import hre from "hardhat";

const { viem } = await hre.network.connect();
const testClient = await viem.getTestClient();

async function increaseTime(seconds: number) {
  await testClient.increaseTime({ seconds });
  await testClient.mine({ blocks: 1 });
}

describe("EscrowMilestones", () => {
  it("funds, votes, finalizes, and pays out", async () => {
    const petitionRegistry = await viem.deployContract("PetitionRegistry");
    const implementerRegistry = await viem.deployContract("ImplementerRegistry");
    const publicClient = await viem.getPublicClient();
    const [creator, funder, implementer] = await viem.getWalletClients();

    await petitionRegistry.write.createPetition(["cid-escrow"], { account: creator.account });

    const escrow = await viem.deployContract("EscrowMilestones", [
      petitionRegistry.address,
      implementerRegistry.address,
      1n,
    ]);

    const block = await publicClient.getBlock();
    const deadline = block.timestamp + 3600n;

    await escrow.write.configureMilestones([1n, [10000000000000000n], deadline], {
      account: creator.account,
    });

    await viem.assertions.emit(
      escrow.write.fund([1n], { account: funder.account, value: 10000000000000000n }),
      escrow,
      "Funded",
    );

    await viem.assertions.emit(
      implementerRegistry.write.setProfile(["profile-cid"], { account: implementer.account }),
      implementerRegistry,
      "ImplementerProfileSet",
    );

    await viem.assertions.emit(
      escrow.write.acceptImplementer([1n], { account: implementer.account }),
      escrow,
      "ImplementerAccepted",
    );

    await viem.assertions.emit(
      escrow.write.submitMilestone([1n, 0n, "proof-cid"], { account: implementer.account }),
      escrow,
      "MilestoneSubmitted",
    );

    await viem.assertions.revertWith(
      escrow.write.voteOnMilestone([1n, 0n, true], { account: implementer.account }),
      "NOT_FUNDER",
    );

    await escrow.write.voteOnMilestone([1n, 0n, true], { account: funder.account });

    await increaseTime(2);

    await viem.assertions.emit(
      escrow.write.finalizeMilestone([1n, 0n]),
      escrow,
      "MilestoneApproved",
    );

    const pending = await escrow.read.pendingPayout([implementer.account.address]);
    assert.equal(pending, 10000000000000000n);

    await escrow.write.withdrawPayout({ account: implementer.account });
    const pendingAfter = await escrow.read.pendingPayout([implementer.account.address]);
    assert.equal(pendingAfter, 0n);
  });

  it("allows refunds after deadline when no payouts", async () => {
    const petitionRegistry = await viem.deployContract("PetitionRegistry");
    const implementerRegistry = await viem.deployContract("ImplementerRegistry");
    const publicClient = await viem.getPublicClient();
    const [creator, funder] = await viem.getWalletClients();

    await petitionRegistry.write.createPetition(["cid-refund"], { account: creator.account });

    const escrow = await viem.deployContract("EscrowMilestones", [
      petitionRegistry.address,
      implementerRegistry.address,
      1n,
    ]);

    const block = await publicClient.getBlock();
    const deadline = block.timestamp + 5n;

    await escrow.write.configureMilestones([1n, [10000000000000000n], deadline], {
      account: creator.account,
    });

    await escrow.write.fund([1n], { account: funder.account, value: 10000000000000000n });

    await increaseTime(10);

    await viem.assertions.emit(
      escrow.write.claimRefund([1n], { account: funder.account }),
      escrow,
      "RefundsClaimed",
    );

    const fundedAmount = await escrow.read.fundedAmount([1n, funder.account.address]);
    assert.equal(fundedAmount, 0n);
  });
});
