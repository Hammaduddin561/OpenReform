"use client";

import Link from "next/link";
import ReactMarkdown from "react-markdown";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { formatEther, parseEther } from "viem";
import { useAccount, useChainId, usePublicClient, useWriteContract } from "wagmi";
import { sepolia } from "wagmi/chains";
import { Header } from "@/components/Header";
import { Modal } from "@/components/Modal";
import { ABIS, CONTRACT_ADDRESSES } from "@/lib/contracts";
import { fetchPetition, pinJson, type Petition, type TimelineEvent } from "@/lib/api";

const statusStyles: Record<string, string> = {
  active: "badge badge-success",
  completed: "badge badge-success",
  refunded: "badge badge-danger",
  created: "badge",
  accepted: "badge",
  in_progress: "badge",
};

type PetitionContent = {
  title?: string;
  description?: string;
  milestones?: Array<{
    title?: string;
    description?: string;
    deadline?: string;
    payout?: string;
  }>;
  fundingDeadline?: string;
  attachment?: string;
  image?: string;
};

type EscrowInfo = {
  creator: string;
  implementer: string;
  deadline: bigint;
  totalFunded: bigint;
  totalPaid: bigint;
  milestoneCount: number;
  currentMilestone: number;
  initialized: boolean;
};

type MilestoneChainState = {
  amount: bigint;
  approved: boolean;
  paid: boolean;
  proofCID: string;
  submittedAt: number;
};

export default function PetitionDetailPage() {
  const params = useParams();
  const petitionId = Array.isArray(params?.id) ? params?.id[0] : (params?.id as string | undefined);

  const { isConnected } = useAccount();
  const chainId = useChainId();
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();

  const [petition, setPetition] = useState<Petition | null>(null);
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [content, setContent] = useState<PetitionContent | null>(null);
  const [escrow, setEscrow] = useState<EscrowInfo | null>(null);
  const [chainMilestones, setChainMilestones] = useState<MilestoneChainState[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [fundAmount, setFundAmount] = useState("0.05");
  const [proofNotes, setProofNotes] = useState("");
  const [selectedMilestone, setSelectedMilestone] = useState(0);
  const [voteMilestone, setVoteMilestone] = useState(0);
  const [voteDecision, setVoteDecision] = useState(true);
  const [modalMessage, setModalMessage] = useState<string | null>(null);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [showVoteModal, setShowVoteModal] = useState(false);

  const isProcessing = Boolean(modalMessage);

  useEffect(() => {
    if (!petitionId) return;
    let ignore = false;

    const load = async () => {
      setError(null);

      try {
        const data = await fetchPetition(petitionId);
        if (ignore) return;
        setPetition(data.petition);
        setTimeline(data.timeline || []);
      } catch (err) {
        if (ignore) return;
        if (err instanceof Error) setError(err.message);
      }

      if (!publicClient || !CONTRACT_ADDRESSES.petitionRegistry) return;

      try {
        const res = await publicClient.readContract({
          address: CONTRACT_ADDRESSES.petitionRegistry,
          abi: ABIS.petitionRegistry,
          functionName: "getPetition",
          args: [BigInt(petitionId)],
        });

        const [creator, contentCID, createdAt, supportCount] = res as readonly [
          string,
          string,
          bigint,
          bigint,
        ];

        if (ignore) return;
        setPetition((prev) =>
  prev ?? {
    petitionId,
    creator,
    contentCID,
    status: "created",
    supporterCount: Number(supportCount),
    totalFunded: "0",
    milestones: [],
    createdAt: Number(createdAt),
    lastUpdated: Number(createdAt),
  },
);
      } catch (err) {
        if (ignore) return;
        if (err instanceof Error) setError(err.message);
      }
    };

    load();

    return () => {
      ignore = true;
    };
  }, [petitionId, publicClient]);

  useEffect(() => {
    if (!petition?.contentCID) return;
    let ignore = false;

    const loadContent = async () => {
      try {
        const res = await fetch(`https://gateway.pinata.cloud/ipfs/${petition.contentCID}`);
        if (!res.ok) throw new Error("Failed to fetch IPFS content");
        const json = (await res.json()) as PetitionContent;
        if (!ignore) setContent(json);
      } catch {
        if (!ignore) setContent(null);
      }
    };

    loadContent();

    return () => {
      ignore = true;
    };
  }, [petition?.contentCID]);

  useEffect(() => {
    const escrowAddress = CONTRACT_ADDRESSES.escrowMilestones;
    if (!publicClient || !escrowAddress || !petitionId) return;
    let ignore = false;

    const loadEscrow = async () => {
      try {
        const res = await publicClient.readContract({
          address: escrowAddress,
          abi: ABIS.escrowMilestones,
          functionName: "getEscrow",
          args: [BigInt(petitionId)],
        });

        const [creator, implementer, deadline, totalFunded, totalPaid, milestoneCount, currentMilestone, initialized] =
          res as readonly [
            string,
            string,
            bigint,
            bigint,
            bigint,
            bigint,
            bigint,
            boolean,
          ];

        if (ignore) return;
        const escrowInfo: EscrowInfo = {
          creator,
          implementer,
          deadline,
          totalFunded,
          totalPaid,
          milestoneCount: Number(milestoneCount),
          currentMilestone: Number(currentMilestone),
          initialized,
        };
        setEscrow(escrowInfo);

        if (escrowInfo.milestoneCount > 0) {
          const milestones: MilestoneChainState[] = [];
          for (let i = 0; i < escrowInfo.milestoneCount; i += 1) {
            const data = await publicClient.readContract({
              address: escrowAddress,
              abi: ABIS.escrowMilestones,
              functionName: "getMilestone",
              args: [BigInt(petitionId), BigInt(i)],
            });
            const [amount, approved, paid, proofCID, submittedAt] = data as readonly [
              bigint,
              boolean,
              boolean,
              string,
              bigint,
              bigint,
            ];
            milestones.push({
              amount,
              approved,
              paid,
              proofCID,
              submittedAt: Number(submittedAt),
            });
          }
          if (!ignore) setChainMilestones(milestones);
        }
      } catch {
        if (!ignore) setEscrow(null);
      }
    };

    loadEscrow();

    return () => {
      ignore = true;
    };
  }, [publicClient, petitionId]);

  const mergedMilestones = useMemo(() => {
    const ipfsMilestones = content?.milestones ?? [];
    const indexedMilestones = petition?.milestones ?? [];
    const chainCount = chainMilestones.length;
    const length = Math.max(ipfsMilestones.length, indexedMilestones.length, chainCount);

    return Array.from({ length }).map((_, index) => {
      const meta = ipfsMilestones[index] ?? {};
      const indexed = indexedMilestones.find((m) => m.index === index);
      const chain = chainMilestones[index];

      return {
        index,
        title: meta.title || `Milestone ${index + 1}`,
        description: meta.description || "",
        deadline: meta.deadline || "",
        payout: meta.payout || (chain?.amount ? formatEther(chain.amount) : ""),
        proofCID: indexed?.proofCID || chain?.proofCID,
        submittedAt: indexed?.submittedAt || chain?.submittedAt,
        approved: indexed?.approved || chain?.approved || false,
        paidOut: indexed?.paidOut || chain?.paid || false,
      };
    });
  }, [content, petition, chainMilestones]);

  const totalGoal = useMemo(() => {
    const sum = mergedMilestones.reduce((acc, milestone) => {
      const value = Number(milestone.payout || 0);
      return Number.isFinite(value) ? acc + value : acc;
    }, 0);
    return sum;
  }, [mergedMilestones]);

  const totalFunded = useMemo(() => {
    if (petition?.totalFunded && petition.totalFunded !== "0") {
      return Number(formatEther(BigInt(petition.totalFunded)));
    }
    if (escrow?.totalFunded) {
      return Number(formatEther(escrow.totalFunded));
    }
    return 0;
  }, [petition, escrow]);

  const progress = totalGoal > 0 ? Math.min((totalFunded / totalGoal) * 100, 100) : 0;

  async function runTx(action: () => Promise<unknown>, successMessage: string) {
    if (!isConnected) {
      setStatus("Connect your wallet first.");
      return;
    }
    if (chainId !== sepolia.id) {
      setStatus("Please switch to Sepolia.");
      return;
    }
    try {
      setModalMessage("Submitting transaction...");
      await action();
      setStatus(successMessage);
    } catch (err) {
      if (err instanceof Error) setStatus(err.message);
      else setStatus("Transaction failed.");
    } finally {
      setModalMessage(null);
    }
  }

  async function handleSupport() {
    const petitionRegistry = CONTRACT_ADDRESSES.petitionRegistry;
    if (!petitionRegistry) {
      setStatus("Petition registry address not configured.");
      return;
    }
    await runTx(
      () =>
        writeContractAsync({
          address: petitionRegistry,
          abi: ABIS.petitionRegistry,
          functionName: "support",
          args: [BigInt(petitionId || 0)],
        }),
      "Support recorded on-chain.",
    );
  }

  async function handleFund() {
    const escrowAddress = CONTRACT_ADDRESSES.escrowMilestones;
    if (!escrowAddress) {
      setStatus("Escrow contract not configured.");
      return;
    }
    const value = parseEther(fundAmount || "0");
    if (value <= BigInt(0)) {
      setStatus("Enter a funding amount.");
      return;
    }

    await runTx(
      () =>
        writeContractAsync({
          address: escrowAddress,
          abi: ABIS.escrowMilestones,
          functionName: "fund",
          args: [BigInt(petitionId || 0)],
          value,
        }),
      "Funding sent to escrow.",
    );
  }

  async function handleAccept() {
    const escrowAddress = CONTRACT_ADDRESSES.escrowMilestones;
    if (!escrowAddress) {
      setStatus("Escrow contract not configured.");
      return;
    }

    await runTx(
      () =>
        writeContractAsync({
          address: escrowAddress,
          abi: ABIS.escrowMilestones,
          functionName: "acceptImplementer",
          args: [BigInt(petitionId || 0)],
        }),
      "Implementer accepted.",
    );
  }

  async function handleSubmitMilestone() {
    const escrowAddress = CONTRACT_ADDRESSES.escrowMilestones;
    if (!escrowAddress) {
      setStatus("Escrow contract not configured.");
      return;
    }

    await runTx(
      async () => {
        setModalMessage("Pinning proof to IPFS...");
        const pinned = await pinJson(
          {
            petitionId,
            milestoneIndex: selectedMilestone,
            notes: proofNotes,
          },
          `milestone-${petitionId}-${selectedMilestone}-${Date.now()}`,
        );

        setModalMessage("Submitting proof on-chain...");
        await writeContractAsync({
          address: escrowAddress,
          abi: ABIS.escrowMilestones,
          functionName: "submitMilestone",
          args: [BigInt(petitionId || 0), BigInt(selectedMilestone), pinned.cid],
        });
      },
      "Milestone proof submitted.",
    );

    setShowSubmitModal(false);
  }

  async function handleVote() {
    const escrowAddress = CONTRACT_ADDRESSES.escrowMilestones;
    if (!escrowAddress) {
      setStatus("Escrow contract not configured.");
      return;
    }

    await runTx(
      () =>
        writeContractAsync({
          address: escrowAddress,
          abi: ABIS.escrowMilestones,
          functionName: "voteOnMilestone",
          args: [BigInt(petitionId || 0), BigInt(voteMilestone), voteDecision],
        }),
      "Vote submitted.",
    );

    setShowVoteModal(false);
  }

  return (
    <div className="min-h-screen bg-[#0b0f1a]">
      <Header />
      <main className="container-page pt-32 pb-16">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <Link className="subtle text-xs uppercase tracking-[0.2em]" href="/">
              Back to home
            </Link>
            <h1 className="section-title mt-4">
              {content?.title || `Petition #${petitionId}`}
            </h1>
            <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
              <span className={statusStyles[petition?.status || "created"] || "badge"}>
                {petition?.status || "created"}
              </span>
              {petition?.creator && (
                <span className="subtle">Creator: {truncate(petition.creator)}</span>
              )}
              {petition?.contentCID && (
                <span className="subtle">CID: {truncate(petition.contentCID)}</span>
              )}
            </div>
          </div>
          <div className="card card-muted px-5 py-4 text-sm">
            <p className="text-xs uppercase tracking-[0.2em] text-[#6B7280]">
              Supporters
            </p>
            <p className="mt-2 text-2xl font-semibold">
              {petition?.supporterCount ?? 0}
            </p>
          </div>
        </div>

        {error && (
          <p className="mt-6 rounded-lg border border-[#EF4444]/40 bg-[#1f2937] px-4 py-3 text-sm text-[#EF4444]">
            {error}
          </p>
        )}
        {status && <p className="subtle mt-4 text-sm">{status}</p>}

        <div className="mt-8 grid gap-8 lg:grid-cols-[1.6fr_0.7fr]">
          <section className="space-y-6">
            <div className="card p-6">
              <h2 className="text-lg font-semibold">Petition details</h2>
              <div className="mt-4 text-sm text-[#6B7280]">
                {content?.description ? (
                  <ReactMarkdown>{content.description}</ReactMarkdown>
                ) : (
                  <p>No description loaded yet.</p>
                )}
              </div>
              {content?.attachment && (
                <p className="subtle mt-4 text-xs">
                  Attachment: {content.attachment}
                </p>
              )}
            </div>

            <div className="card p-6">
              <h2 className="text-lg font-semibold">Milestones</h2>
              <div className="mt-4 space-y-4">
                {mergedMilestones.map((milestone) => (
                  <div key={`milestone-${milestone.index}`} className="card card-muted p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-white">{milestone.title}</p>
                        <p className="subtle text-xs">Milestone {milestone.index + 1}</p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        {milestone.approved && <span className="badge badge-success">Approved</span>}
                        {milestone.paidOut && <span className="badge badge-success">Paid</span>}
                        {!milestone.approved && milestone.proofCID && (
                          <span className="badge">Submitted</span>
                        )}
                        {!milestone.proofCID && <span className="badge">Pending</span>}
                      </div>
                    </div>
                    <p className="subtle mt-3 text-sm">{milestone.description || "No notes"}</p>
                    <div className="mt-3 grid gap-2 text-xs text-[#6B7280] md:grid-cols-3">
                      <span>Deadline: {formatDate(milestone.deadline)}</span>
                      <span>Payout: {milestone.payout || "--"} ETH</span>
                      <span>Proof CID: {milestone.proofCID ? truncate(milestone.proofCID) : "--"}</span>
                    </div>
                  </div>
                ))}
                {mergedMilestones.length === 0 && (
                  <p className="subtle text-sm">No milestones configured yet.</p>
                )}
              </div>
            </div>

            <div className="card p-6">
              <h2 className="text-lg font-semibold">Timeline</h2>
              <div className="mt-4 space-y-3">
                {timeline.map((event) => (
                  <div key={`${event.type}-${event.txHash}-${event.blockNumber}`} className="card card-muted p-4">
                    <div className="flex items-center gap-3">
                      <EventIcon type={event.type} />
                      <div>
                        <p className="text-sm font-semibold">{event.type}</p>
                        <p className="subtle text-xs">
                          {formatTimestamp(event.timestamp)} · {event.txHash.slice(0, 10)}...
                        </p>
                      </div>
                    </div>
                    <div className="mt-3 text-xs text-[#6B7280]">
                      {renderEventDetails(event)}
                    </div>
                  </div>
                ))}
                {timeline.length === 0 && (
                  <p className="subtle text-sm">No timeline events indexed yet.</p>
                )}
              </div>
            </div>
          </section>

          <aside className="space-y-6">
            <div className="card p-6">
              <h3 className="text-base font-semibold">Funding</h3>
              <div className="mt-4">
                <div className="progress-track">
                  <div className="progress-fill" style={{ width: `${progress}%` }} />
                </div>
                <div className="mt-2 flex items-center justify-between text-xs text-[#6B7280]">
                  <span>{totalFunded.toFixed(2)} ETH funded</span>
                  <span>Goal {totalGoal.toFixed(2)} ETH</span>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-3">
                <button className="btn-secondary" onClick={handleSupport}>
                  Support
                </button>
                <button className="btn-success" onClick={handleFund}>
                  Fund
                </button>
              </div>
              <input
                className="input-field mt-3"
                value={fundAmount}
                onChange={(event) => setFundAmount(event.target.value)}
                placeholder="Funding amount in ETH"
              />
            </div>

            <div className="card p-6">
              <h3 className="text-base font-semibold">Implementer</h3>
              <p className="subtle mt-2 text-sm">
                {petition?.implementer
                  ? `Implementer: ${truncate(petition.implementer)}`
                  : escrow?.implementer && escrow.implementer !== "0x0000000000000000000000000000000000000000"
                    ? `Implementer: ${truncate(escrow.implementer)}`
                    : "No implementer accepted yet."}
              </p>
              <button className="btn-primary mt-4" onClick={handleAccept}>
                Accept as implementer
              </button>
            </div>

            <div className="card card-muted p-6">
              <h3 className="text-base font-semibold">Milestone actions</h3>
              <div className="mt-4 flex flex-col gap-3">
                <button
                  className="btn-secondary"
                  onClick={() => setShowSubmitModal(true)}
                >
                  Submit milestone proof
                </button>
                <button className="btn-secondary" onClick={() => setShowVoteModal(true)}>
                  Vote on milestone
                </button>
              </div>
            </div>
          </aside>
        </div>
      </main>

      <Modal
        open={showSubmitModal}
        title="Submit milestone proof"
        onClose={() => setShowSubmitModal(false)}
      >
        <div className="space-y-4">
          <label className="text-xs uppercase tracking-[0.2em] text-[#6B7280]">
            Milestone index
          </label>
          <input
            className="input-field"
            type="number"
            value={selectedMilestone}
            onChange={(event) => setSelectedMilestone(Number(event.target.value))}
            min={0}
            max={Math.max(mergedMilestones.length - 1, 0)}
          />
          <label className="text-xs uppercase tracking-[0.2em] text-[#6B7280]">
            Proof notes
          </label>
          <textarea
            className="min-h-[120px]"
            value={proofNotes}
            onChange={(event) => setProofNotes(event.target.value)}
            placeholder="Describe the proof for this milestone"
          />
          <button className="btn-primary" onClick={handleSubmitMilestone}>
            Submit proof
          </button>
        </div>
      </Modal>

      <Modal
        open={showVoteModal}
        title="Vote on milestone"
        onClose={() => setShowVoteModal(false)}
      >
        <div className="space-y-4">
          <label className="text-xs uppercase tracking-[0.2em] text-[#6B7280]">
            Milestone index
          </label>
          <input
            className="input-field"
            type="number"
            value={voteMilestone}
            onChange={(event) => setVoteMilestone(Number(event.target.value))}
            min={0}
            max={Math.max(mergedMilestones.length - 1, 0)}
          />
          <div className="flex gap-3">
            <button
              className={voteDecision ? "btn-success" : "btn-secondary"}
              onClick={() => setVoteDecision(true)}
            >
              Approve
            </button>
            <button
              className={!voteDecision ? "btn-danger" : "btn-secondary"}
              onClick={() => setVoteDecision(false)}
            >
              Reject
            </button>
          </div>
          <button className="btn-primary" onClick={handleVote}>
            Submit vote
          </button>
        </div>
      </Modal>

      <Modal open={isProcessing} title="Processing" onClose={() => setModalMessage(null)}>
        <div className="flex items-center gap-3">
          <span className="h-3 w-3 animate-spin rounded-full border-2 border-[#2563EB] border-t-transparent" />
          <span>{modalMessage}</span>
        </div>
      </Modal>
    </div>
  );
}

function truncate(value: string, size = 6) {
  if (!value) return value;
  return `${value.slice(0, size)}...${value.slice(-4)}`;
}

function formatDate(value?: string) {
  if (!value) return "--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toISOString().replace("T", " ").slice(0, 19);
}

function formatTimestamp(timestamp?: number) {
  if (!timestamp) return "--";
  return new Date(timestamp * 1000).toISOString().replace("T", " ").slice(0, 19);
}

function renderEventDetails(event: TimelineEvent) {
  const entries = Object.entries(event).filter(
    ([key]) => !["type", "petitionId", "timestamp", "blockNumber", "txHash"].includes(key),
  );
  if (entries.length === 0) return "No extra details";
  return (
    <ul className="space-y-1">
      {entries.map(([key, value]) => (
        <li key={`${event.txHash}-${key}`}>
          {key}: {String(value).slice(0, 80)}
        </li>
      ))}
    </ul>
  );
}

function EventIcon({ type }: { type: string }) {
  const color =
    type === "Funded" || type === "PayoutReleased"
      ? "#10B981"
      : type === "RefundsClaimed"
        ? "#EF4444"
        : "#2563EB";

  return (
    <span className="flex h-9 w-9 items-center justify-center rounded-full border border-[#243043]" style={{ color }}>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={1.8}
        stroke="currentColor"
        className="h-4 w-4"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 6v6l4 2"
        />
      </svg>
    </span>
  );
}



