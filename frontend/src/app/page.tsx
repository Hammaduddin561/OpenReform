"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Header } from "@/components/Header";
import { ABIS, CONTRACT_ADDRESSES } from "@/lib/contracts";
import { fetchPetitions, type Petition } from "@/lib/api";
import { usePublicClient } from "wagmi";

const statusStyles: Record<string, string> = {
  active: "badge badge-success",
  completed: "badge badge-success",
  refunded: "badge badge-danger",
  created: "badge",
  accepted: "badge",
  in_progress: "badge",
};

export default function Home() {
  const [petitions, setPetitions] = useState<Petition[]>([]);
  const [error, setError] = useState<string | null>(null);
  const publicClient = usePublicClient();

  useEffect(() => {
    let ignore = false;

    const load = async () => {
      try {
        const data = await fetchPetitions();
        if (ignore) return;
        if (data.petitions && data.petitions.length > 0) {
          setPetitions(data.petitions);
          setError(null);
          return;
        }
      } catch (err) {
        if (ignore) return;
        if (err instanceof Error) setError(err.message);
      }

      if (!publicClient || !CONTRACT_ADDRESSES.petitionRegistry) {
        return;
      }

      try {
        const total = await publicClient.readContract({
          address: CONTRACT_ADDRESSES.petitionRegistry,
          abi: ABIS.petitionRegistry,
          functionName: "totalPetitions",
          args: [],
        });
        const totalNumber = Number(total);
        if (!Number.isFinite(totalNumber) || totalNumber === 0) {
          return;
        }

        const limit = Math.min(totalNumber, 12);
        const results: Petition[] = [];

        for (let id = totalNumber; id >= 1 && results.length < limit; id -= 1) {
          const res = await publicClient.readContract({
            address: CONTRACT_ADDRESSES.petitionRegistry,
            abi: ABIS.petitionRegistry,
            functionName: "getPetition",
            args: [BigInt(id)],
          });
          const [creator, contentCID, createdAt, supportCount] = res as readonly [
            string,
            string,
            bigint,
            bigint,
          ];

          const supporterCount = Number(supportCount);
          const createdAtNumber = Number(createdAt);

          results.push({
            petitionId: id.toString(),
            creator,
            contentCID,
            status: supporterCount > 0 ? "active" : "created",
            supporterCount,
            totalFunded: "0",
            milestones: [],
            createdAt: createdAtNumber,
            lastUpdated: createdAtNumber,
          });
        }

        if (ignore) return;
        if (results.length > 0) {
          setPetitions(results);
          setError(null);
        }
      } catch (err) {
        if (ignore) return;
        if (err instanceof Error) setError(err.message);
      }
    };

    load();

    return () => {
      ignore = true;
    };
  }, [publicClient]);

  const petitionCount = useMemo(() => petitions.length, [petitions]);

  return (
    <div className="min-h-screen bg-[#0b0f1a]">
      <Header />
      <main className="container-page pt-32 pb-16">
        <section className="card p-8 md:p-10">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div className="space-y-4">
              <span className="badge">Decentralized petitions</span>
              <h1 className="section-title">Turn Petitions into Action</h1>
              <p className="subtle max-w-xl text-base">
                Launch a petition, fund milestones, and unlock payouts only when
                funders approve progress on-chain.
              </p>
              <div className="flex flex-wrap gap-3">
                <Link href="/create" className="btn-primary">
                  Create Petition
                </Link>
                <Link href="/demo" className="btn-secondary">
                  Demo Path
                </Link>
              </div>
            </div>
            <div className="card card-muted p-6 text-sm">
              <p className="text-xs uppercase tracking-[0.2em] text-[#6B7280]">
                Live petitions
              </p>
              <p className="mt-3 text-3xl font-bold text-white">
                {petitionCount}
              </p>
              <p className="subtle mt-2 text-xs">
                Indexed from Sepolia + on-chain fallback
              </p>
            </div>
          </div>
        </section>

        <section className="mt-10">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <h2 className="text-xl font-semibold">Petitions dashboard</h2>
            <span className="subtle text-sm">
              {petitionCount} active record{petitionCount === 1 ? "" : "s"}
            </span>
          </div>

          {error && (
            <p className="mt-4 rounded-lg border border-[#EF4444]/40 bg-[#1f2937] px-4 py-3 text-sm text-[#EF4444]">
              {error}
            </p>
          )}

          <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {petitions.map((petition) => (
              <div key={petition.petitionId} className="card p-6">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-white">
                    Petition #{petition.petitionId}
                  </span>
                  <span className={statusStyles[petition.status] || "badge"}>
                    {petition.status}
                  </span>
                </div>
                <p className="subtle mt-4 text-sm">
                  CID: {petition.contentCID.slice(0, 36)}...
                </p>
                <div className="mt-6 grid gap-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="subtle">Supporters</span>
                    <span>{petition.supporterCount}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="subtle">Funded</span>
                    <span>{Number(petition.totalFunded) / 1e18} ETH</span>
                  </div>
                </div>
                <div className="mt-6 flex gap-3">
                  <Link
                    href={`/petitions/${petition.petitionId}`}
                    className="btn-primary"
                  >
                    View
                  </Link>
                  <Link
                    href={`/petitions/${petition.petitionId}`}
                    className="btn-secondary"
                  >
                    Support
                  </Link>
                </div>
              </div>
            ))}
            {petitionCount === 0 && (
              <div className="card p-6 text-sm text-[#6B7280]">
                No petitions indexed yet. Create the first one.
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
