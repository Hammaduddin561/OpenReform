"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useAccount, useChainId, useWriteContract } from "wagmi";
import { sepolia } from "wagmi/chains";
import { Header } from "@/components/Header";
import { pinJson, fetchPetitions, type Petition } from "@/lib/api";
import { ABIS, CONTRACT_ADDRESSES } from "@/lib/contracts";

export default function ImplementerProfilePage() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { writeContractAsync } = useWriteContract();

  const [summary, setSummary] = useState("");
  const [profileCid, setProfileCid] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [petitions, setPetitions] = useState<Petition[]>([]);

  useEffect(() => {
    let ignore = false;
    fetchPetitions()
      .then((data) => {
        if (ignore) return;
        setPetitions(data.petitions || []);
      })
      .catch(() => {
        if (ignore) return;
      });

    return () => {
      ignore = true;
    };
  }, []);

  const accepted = useMemo(() => {
    if (!address) return [];
    return petitions.filter(
      (petition) =>
        petition.implementer?.toLowerCase() === address.toLowerCase(),
    );
  }, [petitions, address]);

  async function handlePin() {
    setStatus("Pinning profile to IPFS...");
    const pinned = await pinJson({ summary }, `profile-${Date.now()}`);
    setProfileCid(pinned.cid);
    setStatus(`Profile pinned: ${pinned.cid}`);
  }

  async function handleSetProfile() {
    if (!isConnected) {
      setStatus("Connect your wallet first.");
      return;
    }
    if (chainId !== sepolia.id) {
      setStatus("Please switch your wallet to Sepolia.");
      return;
    }
    if (!CONTRACT_ADDRESSES.implementerRegistry) {
      setStatus("Implementer registry address not configured.");
      return;
    }
    if (!profileCid) {
      setStatus("Pin your profile first.");
      return;
    }

    try {
      setStatus("Submitting on-chain profile...");
      await writeContractAsync({
        address: CONTRACT_ADDRESSES.implementerRegistry,
        abi: ABIS.implementerRegistry,
        functionName: "setProfile",
        args: [profileCid],
      });
      setStatus("Profile updated on-chain.");
    } catch (err) {
      if (err instanceof Error) setStatus(err.message);
      else setStatus("Failed to update profile.");
    }
  }

  return (
    <div className="min-h-screen bg-[#0b0f1a]">
      <Header />
      <main className="container-page pt-32 pb-16">
        <header>
          <h1 className="section-title">Implementer profile</h1>
          <p className="subtle mt-2">
            Publish your implementer profile and manage accepted petitions.
          </p>
        </header>

        <section className="mt-8 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="card p-6">
            <h3 className="text-lg font-semibold">Profile details</h3>
            <textarea
              className="mt-3 min-h-[140px]"
              value={summary}
              onChange={(event) => setSummary(event.target.value)}
              placeholder="Describe your organization, experience, and track record."
            />
            <div className="mt-4 flex flex-wrap gap-3">
              <button className="btn-secondary" onClick={handlePin}>
                Pin profile to IPFS
              </button>
              <button className="btn-primary" onClick={handleSetProfile}>
                Save on-chain
              </button>
            </div>
            <input
              className="input-field mt-4"
              value={profileCid}
              onChange={(event) => setProfileCid(event.target.value)}
              placeholder="Profile CID"
            />
            {status && <p className="subtle mt-3 text-sm">{status}</p>}
          </div>

          <div className="card card-muted p-6">
            <h3 className="text-lg font-semibold">Accepted petitions</h3>
            <div className="mt-4 space-y-3">
              {accepted.map((petition) => (
                <div key={petition.petitionId} className="card p-4">
                  <p className="text-sm font-semibold">Petition #{petition.petitionId}</p>
                  <Link
                    href={`/petitions/${petition.petitionId}`}
                    className="btn-secondary mt-3 inline-flex"
                  >
                    View
                  </Link>
                </div>
              ))}
              {accepted.length === 0 && (
                <p className="subtle text-sm">No accepted petitions yet.</p>
              )}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
