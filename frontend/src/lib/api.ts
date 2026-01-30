export type MilestoneInfo = {
  index: number;
  proofCID?: string;
  submittedAt?: number;
  approved: boolean;
  approvedAt?: number;
  approver?: string;
  paidOut: boolean;
  payoutAmount?: string;
};

export type Petition = {
  petitionId: string;
  creator: string;
  contentCID: string;
  status: string;
  supporterCount: number;
  totalFunded: string;
  implementer?: string;
  implementerProfileCID?: string;
  milestones: MilestoneInfo[];
  createdAt: number;
  lastUpdated: number;
};

export type TimelineEvent = {
  type: string;
  petitionId: string;
  timestamp: number;
  blockNumber: number;
  txHash: string;
  [key: string]: unknown;
};

export type PetitionListResponse = {
  petitions: Petition[];
  total: number;
};

export type PetitionDetailResponse = {
  petition: Petition;
  timeline: TimelineEvent[];
};

export type TimelineResponse = {
  events: TimelineEvent[];
  total: number;
};

export type IpfsPinResponse = {
  cid: string;
  gateway: string;
  timestamp: number;
};

const API_BASE =
  process.env.NEXT_PUBLIC_INDEXER_API_URL || "http://localhost:3001/api";

export async function fetchPetitions(): Promise<PetitionListResponse> {
  const res = await fetch(`${API_BASE}/petitions`, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to fetch petitions");
  return res.json() as Promise<PetitionListResponse>;
}

export async function fetchPetition(petitionId: string): Promise<PetitionDetailResponse> {
  const res = await fetch(`${API_BASE}/petitions/${petitionId}`, {
    cache: "no-store",
  });
  if (!res.ok) throw new Error("Failed to fetch petition");
  return res.json() as Promise<PetitionDetailResponse>;
}

export async function fetchTimeline(petitionId: string): Promise<TimelineResponse> {
  const res = await fetch(`${API_BASE}/petitions/${petitionId}/timeline`, {
    cache: "no-store",
  });
  if (!res.ok) throw new Error("Failed to fetch timeline");
  return res.json() as Promise<TimelineResponse>;
}

export async function pinJson(content: object, name?: string): Promise<IpfsPinResponse> {
  const res = await fetch(`${API_BASE}/ipfs/pin`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content, name }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || "Failed to pin content");
  }

  return res.json() as Promise<IpfsPinResponse>;
}