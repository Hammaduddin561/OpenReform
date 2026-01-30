"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  useAccount,
  useWriteContract,
} from "wagmi";
import { parseEther } from "viem";
import { WalletStatus } from "@/components/WalletStatus";
import { fetchPetition, pinJson, type Petition, type TimelineEvent } from "@/lib/api";
import { ABIS, CONTRACT_ADDRESSES } from "@/lib/contracts";

export default function PetitionDetailPage() {
  const params = useParams();
  const petitionId = useMemo(() => String(params?.id || ""), [params]);
  const { isConnected } = useAccount();
  const { writeContractAsync } = useWriteContract();

  const [petition, setPetition] = useState<Petition | null>(null);
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  const [fundAmount, setFundAmount] = useState("0.05");
  const [profileSummary, setProfileSummary] = useState("");
  const [profileCid, setProfileCid] = useState("");
  const [milestoneIndex, setMilestoneIndex] = useState("0");
  const [proofSummary, setProofSummary] = useState("");
  const [proofCid, setProofCid] = useState("");
  const [voteSupport, setVoteSupport] = useState(true);

  useEffect(() => {
    if (!petitionId) return;
    fetchPetition(petitionId)
      .then((data) => {
        setPetition(data.petition);
        setTimeline(data.timeline || []);
      })
      .catch((err: Error) => setError(err.message || "Failed to load petition"));
  }, [petitionId]);

  async function runTx(task: () => Promise<void>) {
    if (!isConnected) {
      setStatus("Connect your wallet first.");
      return;
    }
    try {
      setStatus("Submitting transaction...");
      await task();
      setStatus("Transaction sent. Refresh the timeline in a moment.");
    } catch (err: unknown) {
      const message = getErrorMessage(err);
      setStatus(message || "Transaction failed");
    }
  }

  async function handleSupport() {
    await runTx(async () => {
      await writeContractAsync({
        address: CONTRACT_ADDRESSES.petitionRegistry,
        abi: ABIS.petitionRegistry,
        functionName: "support",
        args: [BigInt(petitionId)],
      });
    });
  }

  async function handleFund() {
    await runTx(async () => {
      const value = parseEther(fundAmount || "0");
      await writeContractAsync({
        address: CONTRACT_ADDRESSES.escrowMilestones,
        abi: ABIS.escrowMilestones,
        functionName: "fund",
        args: [BigInt(petitionId)],
        value,
      });
    });
  }

  async function handlePinProfile() {
    setStatus("Pinning profile to IPFS...");
    const pinned = await pinJson({ summary: profileSummary }, `profile-${Date.now()}`);
    setProfileCid(pinned.cid);
    setStatus(`Profile pinned: ${pinned.cid}`);
  }

  async function handleSetProfile() {
    await runTx(async () => {
      await writeContractAsync({
        address: CONTRACT_ADDRESSES.implementerRegistry,
        abi: ABIS.implementerRegistry,
        functionName: "setProfile",
        args: [profileCid],
      });
    });
  }

  async function handleAcceptImplementer() {
    await runTx(async () => {
      await writeContractAsync({
        address: CONTRACT_ADDRESSES.escrowMilestones,
        abi: ABIS.escrowMilestones,
        functionName: "acceptImplementer",
        args: [BigInt(petitionId)],
      });
    });
  }

  async function handlePinProof() {
    setStatus("Pinning proof to IPFS...");
    const pinned = await pinJson({ summary: proofSummary }, `proof-${Date.now()}`);
    setProofCid(pinned.cid);
    setStatus(`Proof pinned: ${pinned.cid}`);
  }

  async function handleSubmitProof() {
    await runTx(async () => {
      await writeContractAsync({
        address: CONTRACT_ADDRESSES.escrowMilestones,
        abi: ABIS.escrowMilestones,
        functionName: "submitMilestone",
        args: [BigInt(petitionId), BigInt(milestoneIndex), proofCid],
      });
    });
  }

  async function handleVote() {
    await runTx(async () => {
      await writeContractAsync({
        address: CONTRACT_ADDRESSES.escrowMilestones,
        abi: ABIS.escrowMilestones,
        functionName: "voteOnMilestone",
        args: [BigInt(petitionId), BigInt(milestoneIndex), voteSupport],
      });
    });
  }

  async function handleFinalize() {
    await runTx(async () => {
      await writeContractAsync({
        address: CONTRACT_ADDRESSES.escrowMilestones,
        abi: ABIS.escrowMilestones,
        functionName: "finalizeMilestone",
        args: [BigInt(petitionId), BigInt(milestoneIndex)],
      });
    });
  }

  async function handleWithdraw() {
    await runTx(async () => {
      await writeContractAsync({
        address: CONTRACT_ADDRESSES.escrowMilestones,
        abi: ABIS.escrowMilestones,
        functionName: "withdrawPayout",
        args: [],
      });
    });
  }

  async function handleRefund() {
    await runTx(async () => {
      await writeContractAsync({
        address: CONTRACT_ADDRESSES.escrowMilestones,
        abi: ABIS.escrowMilestones,
        functionName: "claimRefund",
        args: [BigInt(petitionId)],
      });
    });
  }

  return (
    <main className="px-6 py-10 lg:px-16">
      <header className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <Link className="subtle text-xs uppercase tracking-[0.2em]" href="/">
            Back to petitions
          </Link>
          <h1 className="section-title mt-4">Petition #{petitionId}</h1>
          <p className="subtle mt-3 max-w-xl">
            Track the petition timeline, fund milestones, and vote approvals.
          </p>
        </div>
        <WalletStatus />
      </header>

      {error && (
        <p className="mt-6 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error}
        </p>
      )}

      {petition && (
        <section className="mt-10 grid gap-8 lg:grid-cols-[1.3fr_0.7fr]">
          <div className="space-y-6">
            <div className="card p-6">
              <div className="flex items-center justify-between">
                <span className="tag">Status</span>
                <span className="text-xs uppercase tracking-[0.2em] text-amber-200/80">
                  {petition.status}
                </span>
              </div>
              <p className="subtle mt-4 text-sm">CID: {petition.contentCID}</p>
              <div className="mt-4 flex gap-4 text-sm text-white/70">
                <span>Supporters: {petition.supporterCount}</span>
                <span>Funded: {Number(petition.totalFunded) / 1e18} ETH</span>
              </div>
            </div>

            <div className="card p-6">
              <h3 className="text-lg font-semibold">Timeline</h3>
              <ul className="mt-4 space-y-3 text-sm text-white/70">
                {timeline.map((event) => (
                  <li key={`${event.type}-${event.txHash}`}>
                    <span className="tag">{event.type}</span>
                    <span className="ml-3">
                      {new Date(event.timestamp * 1000).toLocaleString()}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="space-y-6">
            <div className="card p-6">
              <h3 className="text-lg font-semibold">Support & Fund</h3>
              <div className="mt-4 space-y-3">
                <button
                  className="w-full rounded-full border border-white/20 px-4 py-2 text-xs uppercase tracking-[0.2em] text-white"
                  onClick={handleSupport}
                >
                  Support petition
                </button>
                <input
                  className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm"
                  value={fundAmount}
                  onChange={(event) => setFundAmount(event.target.value)}
                  placeholder="Amount in ETH"
                />
                <button
                  className="w-full rounded-full bg-amber-300 px-4 py-2 text-xs uppercase tracking-[0.2em] text-black"
                  onClick={handleFund}
                >
                  Fund escrow
                </button>
              </div>
            </div>

            <div className="card p-6">
              <h3 className="text-lg font-semibold">Implementer</h3>
              <textarea
                className="mt-3 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm"
                value={profileSummary}
                onChange={(event) => setProfileSummary(event.target.value)}
                placeholder="Profile summary"
              />
              <div className="mt-3 flex gap-2">
                <button
                  className="flex-1 rounded-full border border-white/20 px-4 py-2 text-xs uppercase tracking-[0.2em] text-white"
                  onClick={handlePinProfile}
                >
                  Pin profile
                </button>
                <button
                  className="flex-1 rounded-full bg-amber-300 px-4 py-2 text-xs uppercase tracking-[0.2em] text-black"
                  onClick={handleSetProfile}
                >
                  Set profile
                </button>
              </div>
              <input
                className="mt-3 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm"
                value={profileCid}
                onChange={(event) => setProfileCid(event.target.value)}
                placeholder="Profile CID"
              />
              <button
                className="mt-3 w-full rounded-full border border-white/20 px-4 py-2 text-xs uppercase tracking-[0.2em] text-white"
                onClick={handleAcceptImplementer}
              >
                Accept implementer
              </button>
            </div>

            <div className="card p-6">
              <h3 className="text-lg font-semibold">Milestones & Voting</h3>
              <input
                className="mt-3 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm"
                value={milestoneIndex}
                onChange={(event) => setMilestoneIndex(event.target.value)}
                placeholder="Milestone index"
              />
              <textarea
                className="mt-3 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm"
                value={proofSummary}
                onChange={(event) => setProofSummary(event.target.value)}
                placeholder="Proof summary"
              />
              <div className="mt-3 flex gap-2">
                <button
                  className="flex-1 rounded-full border border-white/20 px-4 py-2 text-xs uppercase tracking-[0.2em] text-white"
                  onClick={handlePinProof}
                >
                  Pin proof
                </button>
                <button
                  className="flex-1 rounded-full bg-amber-300 px-4 py-2 text-xs uppercase tracking-[0.2em] text-black"
                  onClick={handleSubmitProof}
                >
                  Submit proof
                </button>
              </div>
              <input
                className="mt-3 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm"
                value={proofCid}
                onChange={(event) => setProofCid(event.target.value)}
                placeholder="Proof CID"
              />
              <div className="mt-4 flex items-center gap-3 text-sm">
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="vote"
                    checked={voteSupport}
                    onChange={() => setVoteSupport(true)}
                  />
                  Vote yes
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="vote"
                    checked={!voteSupport}
                    onChange={() => setVoteSupport(false)}
                  />
                  Vote no
                </label>
              </div>
              <button
                className="mt-3 w-full rounded-full border border-white/20 px-4 py-2 text-xs uppercase tracking-[0.2em] text-white"
                onClick={handleVote}
              >
                Cast vote
              </button>
              <button
                className="mt-3 w-full rounded-full border border-white/20 px-4 py-2 text-xs uppercase tracking-[0.2em] text-white"
                onClick={handleFinalize}
              >
                Finalize vote
              </button>
              <button
                className="mt-3 w-full rounded-full border border-white/20 px-4 py-2 text-xs uppercase tracking-[0.2em] text-white"
                onClick={handleWithdraw}
              >
                Withdraw payout
              </button>
              <button
                className="mt-3 w-full rounded-full border border-white/20 px-4 py-2 text-xs uppercase tracking-[0.2em] text-white"
                onClick={handleRefund}
              >
                Claim refund
              </button>
            </div>

            {status && (
              <p className="rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white/70">
                {status}
              </p>
            )}
          </div>
        </section>
      )}
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
