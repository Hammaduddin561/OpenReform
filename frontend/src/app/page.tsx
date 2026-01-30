"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { WalletStatus } from "@/components/WalletStatus";
import { ABIS, CONTRACT_ADDRESSES } from "@/lib/contracts";
import { fetchPetitions, type Petition } from "@/lib/api";
import { usePublicClient } from "wagmi";

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

        const limit = Math.min(totalNumber, 10);
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

  return (
    <main className="px-6 py-10 lg:px-16">
      <header className="glass flex flex-col gap-6 rounded-[32px] px-8 py-10 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-4">
          <span className="tag">OpenReform</span>
          <h1 className="section-title max-w-2xl font-semibold">
            Petition → Fund → Deliver. Public milestones, on-chain voting.
          </h1>
          <p className="subtle max-w-xl text-base leading-relaxed">
            Launch a petition, collect ETH into escrow, and release milestone
            payouts once funders vote approval. Every step stays transparent on
            Sepolia.
          </p>
          <div className="flex flex-wrap gap-4">
            <Link
              href="/create"
              className="rounded-full bg-amber-300 px-6 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-black"
            >
              Create Petition
            </Link>
            <a
              className="rounded-full border border-white/20 px-6 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-white"
              href="https://sepolia.etherscan.io"
              target="_blank"
              rel="noreferrer"
            >
              Sepolia Explorer
            </a>
          </div>
        </div>
        <div className="flex flex-col items-start gap-3">
          <WalletStatus />
          <div className="text-xs uppercase tracking-[0.2em] text-amber-200/80">
            Indexer: {error ? "offline" : "online"}
          </div>
        </div>
      </header>

      <section className="mt-12">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Live petitions</h2>
          <span className="subtle text-sm">
            {petitions.length} active record{petitions.length === 1 ? "" : "s"}
          </span>
        </div>
        {error && (
          <p className="mt-4 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {error}
          </p>
        )}
        <div className="mt-6 grid gap-6 md:grid-cols-2">
          {petitions.map((petition) => (
            <Link
              key={petition.petitionId}
              href={`/petitions/${petition.petitionId}`}
              className="card p-6 transition hover:-translate-y-1 hover:border-amber-200/60"
            >
              <div className="flex items-center justify-between">
                <span className="tag">#{petition.petitionId}</span>
                <span className="text-xs uppercase tracking-[0.2em] text-amber-200/80">
                  {petition.status}
                </span>
              </div>
              <p className="mt-4 break-words text-sm text-white/70">
                CID: {petition.contentCID}
              </p>
              <div className="mt-6 flex flex-wrap gap-4 text-xs text-white/70">
                <span>Supporters: {petition.supporterCount}</span>
                <span>Funded: {Number(petition.totalFunded) / 1e18} ETH</span>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
