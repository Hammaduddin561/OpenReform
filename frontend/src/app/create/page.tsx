"use client";

import { useState } from "react";
import Link from "next/link";
import { useAccount, usePublicClient, useWriteContract } from "wagmi";
import { decodeEventLog, parseEther } from "viem";
import { WalletStatus } from "@/components/WalletStatus";
import { pinJson } from "@/lib/api";
import { ABIS, CONTRACT_ADDRESSES } from "@/lib/contracts";

export default function CreatePetitionPage() {
  const { isConnected } = useAccount();
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [milestones, setMilestones] = useState("0.1,0.2");
  const [deadlineHours, setDeadlineHours] = useState("24");
  const [status, setStatus] = useState<string | null>(null);
  const [petitionId, setPetitionId] = useState<string | null>(null);
  const [cid, setCid] = useState<string | null>(null);

  async function handleCreate() {
    if (!isConnected) {
      setStatus("Connect your wallet first.");
      return;
    }

    if (!CONTRACT_ADDRESSES.petitionRegistry || !CONTRACT_ADDRESSES.escrowMilestones) {
      setStatus("Contract addresses not configured.");
      return;
    }

    try {
      setStatus("Pinning petition content to IPFS...");
      const pinned = await pinJson({ title, description }, `petition-${Date.now()}`);
      setCid(pinned.cid);

      setStatus("Submitting on-chain petition...");
      const txHash = await writeContractAsync({
        address: CONTRACT_ADDRESSES.petitionRegistry,
        abi: ABIS.petitionRegistry,
        functionName: "createPetition",
        args: [pinned.cid],
      });

      if (!publicClient) throw new Error("Public client not ready");
      const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
      let createdId: string | null = null;

      for (const log of receipt.logs) {
        try {
          const decoded = decodeEventLog({
            abi: ABIS.petitionRegistry,
            data: log.data,
            topics: log.topics,
          });
          if (decoded.eventName === "PetitionCreated") {
            createdId = decoded.args.petitionId.toString();
          }
        } catch {
          // Ignore logs from other contracts
        }
      }

      if (!createdId) throw new Error("Unable to read petitionId from logs");
      setPetitionId(createdId);

      const parsedMilestones = milestones
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean)
        .map((value) => parseEther(value));

      if (parsedMilestones.length > 0) {
        const deadline = BigInt(
          Math.floor(Date.now() / 1000) + Number(deadlineHours) * 3600,
        );

        setStatus("Configuring milestones...");
        await writeContractAsync({
          address: CONTRACT_ADDRESSES.escrowMilestones,
          abi: ABIS.escrowMilestones,
          functionName: "configureMilestones",
          args: [BigInt(createdId), parsedMilestones, deadline],
        });
      }

      setStatus("Petition created successfully.");
    } catch (error: unknown) {
      const message = getErrorMessage(error);
      setStatus(message || "Failed to create petition");
    }
  }

  return (
    <main className="px-6 py-10 lg:px-16">
      <header className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <Link className="subtle text-xs uppercase tracking-[0.2em]" href="/">
            Back to home
          </Link>
          <h1 className="section-title mt-4">Launch a petition</h1>
          <p className="subtle mt-3 max-w-xl">
            Pin your petition content to IPFS, publish the CID on-chain, and set
            the milestone escrow schedule in one flow.
          </p>
        </div>
        <WalletStatus />
      </header>

      <section className="glass mt-10 grid gap-8 rounded-[28px] p-8 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-6">
          <label className="block text-sm uppercase tracking-[0.2em] text-white/70">
            Title
            <input
              className="mt-3 w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-base"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Clean water for Ward 7"
            />
          </label>
          <label className="block text-sm uppercase tracking-[0.2em] text-white/70">
            Description
            <textarea
              className="mt-3 min-h-[160px] w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-base"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Explain the problem, goal, and proof expectations."
            />
          </label>
          <label className="block text-sm uppercase tracking-[0.2em] text-white/70">
            Milestone amounts (ETH)
            <input
              className="mt-3 w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-base"
              value={milestones}
              onChange={(event) => setMilestones(event.target.value)}
              placeholder="0.1,0.2,0.3"
            />
          </label>
          <label className="block text-sm uppercase tracking-[0.2em] text-white/70">
            Funding deadline (hours)
            <input
              className="mt-3 w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-base"
              value={deadlineHours}
              onChange={(event) => setDeadlineHours(event.target.value)}
              placeholder="24"
            />
          </label>
          <button
            type="button"
            onClick={handleCreate}
            className="rounded-full bg-amber-300 px-6 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-black"
          >
            Pin + Create
          </button>
          {status && (
            <p className="rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white/70">
              {status}
            </p>
          )}
        </div>
        <div className="space-y-6">
          <div className="card p-6">
            <h3 className="text-lg font-semibold">On-chain output</h3>
            <p className="subtle mt-2 text-sm">
              Petition CID: {cid || "pending"}
            </p>
            <p className="subtle mt-2 text-sm">
              Petition ID: {petitionId || "pending"}
            </p>
            {petitionId && (
              <Link
                href={`/petitions/${petitionId}`}
                className="mt-4 inline-flex rounded-full border border-amber-200/50 px-4 py-2 text-xs uppercase tracking-[0.2em] text-amber-200"
              >
                View petition
              </Link>
            )}
          </div>
          <div className="card p-6">
            <h3 className="text-lg font-semibold">Checklist</h3>
            <ul className="subtle mt-3 space-y-2 text-sm">
              <li>1. Connect wallet on Sepolia.</li>
              <li>2. Provide IPFS content and milestone ETH values.</li>
              <li>3. Create petition + configure milestones.</li>
              <li>4. Share the petition link.</li>
            </ul>
          </div>
        </div>
      </section>
    </main>
  );
}

function getErrorMessage(error: unknown): string | null {
  if (!error || typeof error !== "object") return null;
  if ("shortMessage" in error && typeof error.shortMessage === "string") {
    return error.shortMessage;
  }
  if ("message" in error && typeof error.message === "string") {
    return error.message;
  }
  return null;
}
