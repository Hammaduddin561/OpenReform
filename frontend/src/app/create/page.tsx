"use client";

import { useState } from "react";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import { useAccount, useChainId, usePublicClient, useWriteContract } from "wagmi";
import { decodeEventLog, parseEther } from "viem";
import { sepolia } from "wagmi/chains";
import { Header } from "@/components/Header";
import { Modal } from "@/components/Modal";
import { pinJson } from "@/lib/api";
import { ABIS, CONTRACT_ADDRESSES } from "@/lib/contracts";

const defaultMilestone = () => ({
  title: "",
  description: "",
  payout: "0.1",
  deadline: "",
});

export default function CreatePetitionPage() {
  const { isConnected } = useAccount();
  const chainId = useChainId();
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [descriptionTab, setDescriptionTab] = useState<"edit" | "preview">("edit");
  const [milestones, setMilestones] = useState([defaultMilestone()]);
  const [fundingDeadline, setFundingDeadline] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [petitionId, setPetitionId] = useState<string | null>(null);
  const [cid, setCid] = useState<string | null>(null);
  const [modalMessage, setModalMessage] = useState<string | null>(null);

  const isProcessing = Boolean(modalMessage);

  function updateMilestone(index: number, field: string, value: string) {
    setMilestones((prev) =>
      prev.map((milestone, i) =>
        i === index ? { ...milestone, [field]: value } : milestone,
      ),
    );
  }

  function addMilestone() {
    setMilestones((prev) => [...prev, defaultMilestone()]);
  }

  function removeMilestone(index: number) {
    setMilestones((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleCreate() {
    if (!isConnected) {
      setStatus("Connect your wallet first.");
      return;
    }

    if (!CONTRACT_ADDRESSES.petitionRegistry || !CONTRACT_ADDRESSES.escrowMilestones) {
      setStatus("Contract addresses not configured.");
      return;
    }

    if (chainId !== sepolia.id) {
      setStatus("Please switch your wallet to Sepolia.");
      return;
    }

    try {
      setModalMessage("Pinning petition content to IPFS...");
      const payload = {
        title,
        description,
        milestones,
        fundingDeadline,
        attachment: fileName,
      };

      const pinned = await pinJson(payload, `petition-${Date.now()}`);
      setCid(pinned.cid);

      setModalMessage("Submitting petition on-chain...");
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
          if (decoded.eventName === "PetitionCreated" && decoded.args) {
            const args = decoded.args as { petitionId?: bigint };
            if (args.petitionId !== undefined) {
              createdId = args.petitionId.toString();
            }
          }
        } catch {
          // Ignore logs from other contracts
        }
      }

      if (!createdId) throw new Error("Unable to read petitionId from logs");
      setPetitionId(createdId);

      const parsedMilestones = milestones
        .map((milestone) => milestone.payout.trim())
        .filter(Boolean)
        .map((value) => parseEther(value));

      if (parsedMilestones.length > 0) {
        const deadline = fundingDeadline
          ? Math.floor(new Date(fundingDeadline).getTime() / 1000)
          : Math.floor(Date.now() / 1000) + 24 * 3600;

        setModalMessage("Configuring milestones...");
        await writeContractAsync({
          address: CONTRACT_ADDRESSES.escrowMilestones,
          abi: ABIS.escrowMilestones,
          functionName: "configureMilestones",
          args: [BigInt(createdId), parsedMilestones, BigInt(deadline)],
        });
      }

      setStatus("Petition created successfully.");
    } catch (error: unknown) {
      const message = getErrorMessage(error);
      setStatus(message || "Failed to create petition");
    } finally {
      setModalMessage(null);
    }
  }

  return (
    <div className="min-h-screen bg-[#0b0f1a]">
      <Header />
      <main className="container-page pt-32 pb-16">
        <header className="mb-8">
          <Link className="subtle text-xs uppercase tracking-[0.2em]" href="/">
            Back to home
          </Link>
          <h1 className="section-title mt-4">Create a petition</h1>
          <p className="subtle mt-2 max-w-2xl text-base">
            Publish your petition to IPFS, configure milestone payouts, and launch
            an on-chain escrow in one flow.
          </p>
        </header>

        <section className="card p-6 md:p-8">
          <div className="grid gap-8 lg:grid-cols-[1.3fr_0.7fr]">
            <div className="space-y-6">
              <div>
                <label className="text-sm font-semibold text-white">Title</label>
                <input
                  className="input-field mt-2"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="Clean water for Ward 7"
                />
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <label className="text-sm font-semibold text-white">Description</label>
                  <div className="flex gap-2 text-xs">
                    <button
                      type="button"
                      onClick={() => setDescriptionTab("edit")}
                      className={descriptionTab === "edit" ? "btn-primary" : "btn-secondary"}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => setDescriptionTab("preview")}
                      className={descriptionTab === "preview" ? "btn-primary" : "btn-secondary"}
                    >
                      Preview
                    </button>
                  </div>
                </div>
                {descriptionTab === "edit" ? (
                  <textarea
                    className="mt-2 min-h-[180px]"
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                    placeholder="Explain the problem, goal, and proof expectations."
                  />
                ) : (
                  <div className="card card-muted mt-2 min-h-[180px] p-4 text-sm text-white/80">
                    <ReactMarkdown>{description || "Nothing to preview yet."}</ReactMarkdown>
                  </div>
                )}
              </div>

              <div>
                <label className="text-sm font-semibold text-white">Milestones</label>
                <div className="mt-3 space-y-4">
                  {milestones.map((milestone, index) => (
                    <div key={`milestone-${index}`} className="card card-muted p-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold">Milestone {index + 1}</span>
                        {milestones.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeMilestone(index)}
                            className="text-xs text-[#EF4444]"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                      <div className="mt-3 grid gap-3">
                        <input
                          className="input-field"
                          value={milestone.title}
                          onChange={(event) =>
                            updateMilestone(index, "title", event.target.value)
                          }
                          placeholder="Milestone title"
                        />
                        <textarea
                          className="min-h-[100px]"
                          value={milestone.description}
                          onChange={(event) =>
                            updateMilestone(index, "description", event.target.value)
                          }
                          placeholder="Milestone description"
                        />
                        <div className="grid gap-3 md:grid-cols-2">
                          <input
                            type="datetime-local"
                            className="input-field"
                            value={milestone.deadline}
                            onChange={(event) =>
                              updateMilestone(index, "deadline", event.target.value)
                            }
                          />
                          <input
                            className="input-field"
                            value={milestone.payout}
                            onChange={(event) =>
                              updateMilestone(index, "payout", event.target.value)
                            }
                            placeholder="Payout in ETH"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                  <button type="button" className="btn-secondary" onClick={addMilestone}>
                    Add milestone
                  </button>
                </div>
                <p className="subtle mt-2 text-xs">
                  On-chain escrow stores milestone amounts + a single funding deadline.
                  Detailed milestone notes are kept on IPFS.
                </p>
              </div>

              <div>
                <label className="text-sm font-semibold text-white">Funding deadline</label>
                <input
                  type="datetime-local"
                  className="input-field mt-2"
                  value={fundingDeadline}
                  onChange={(event) => setFundingDeadline(event.target.value)}
                />
              </div>

              <div>
                <label className="text-sm font-semibold text-white">Attachment (optional)</label>
                <div className="mt-2 rounded-lg border border-dashed border-[#243043] bg-[#0f1625] p-4 text-sm text-[#6B7280]">
                  <input
                    type="file"
                    onChange={(event) =>
                      setFileName(event.target.files?.[0]?.name ?? null)
                    }
                  />
                  <p className="mt-2 text-xs">
                    File uploads are stored with the petition metadata (IPFS JSON) in MVP.
                  </p>
                </div>
                {fileName && (
                  <p className="subtle mt-2 text-xs">Selected: {fileName}</p>
                )}
              </div>

              <button type="button" onClick={handleCreate} className="btn-primary">
                Create on Chain
              </button>
              {status && <p className="subtle text-sm">{status}</p>}
            </div>

            <div className="space-y-4">
              <div className="card p-5">
                <h3 className="text-base font-semibold">Submission output</h3>
                <div className="mt-3 space-y-2 text-sm text-[#6B7280]">
                  <p>IPFS CID: {cid || "pending"}</p>
                  <p>Petition ID: {petitionId || "pending"}</p>
                </div>
                {petitionId && (
                  <Link
                    href={`/petitions/${petitionId}`}
                    className="btn-secondary mt-4 inline-flex"
                  >
                    View petition
                  </Link>
                )}
              </div>
              <div className="card card-muted p-5 text-sm text-[#6B7280]">
                <h3 className="text-base font-semibold text-white">Checklist</h3>
                <ul className="mt-3 space-y-2">
                  <li>1. Connect wallet on Sepolia.</li>
                  <li>2. Fill out petition + milestone details.</li>
                  <li>3. Pin metadata to IPFS.</li>
                  <li>4. Create petition and escrow on-chain.</li>
                </ul>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Modal
        open={isProcessing}
        title="Publishing petition"
        onClose={() => setModalMessage(null)}
      >
        <div className="flex items-center gap-3">
          <span className="h-3 w-3 animate-spin rounded-full border-2 border-[#2563EB] border-t-transparent" />
          <span>{modalMessage}</span>
        </div>
      </Modal>
    </div>
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
