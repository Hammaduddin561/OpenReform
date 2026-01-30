"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useAccount } from "wagmi";
import { Header } from "@/components/Header";
import { fetchPetitions, type Petition } from "@/lib/api";

export default function MyPetitionsPage() {
  const { address, isConnected } = useAccount();
  const [petitions, setPetitions] = useState<Petition[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;
    fetchPetitions()
      .then((data) => {
        if (ignore) return;
        setPetitions(data.petitions || []);
      })
      .catch((err) => {
        if (ignore) return;
        setError(err.message || "Failed to load petitions");
      });

    return () => {
      ignore = true;
    };
  }, []);

  const createdByMe = useMemo(() => {
    if (!address) return [];
    return petitions.filter(
      (petition) => petition.creator.toLowerCase() === address.toLowerCase(),
    );
  }, [petitions, address]);

  const acceptedByMe = useMemo(() => {
    if (!address) return [];
    return petitions.filter(
      (petition) => petition.implementer?.toLowerCase() === address.toLowerCase(),
    );
  }, [petitions, address]);

  return (
    <div className="min-h-screen bg-[#0b0f1a]">
      <Header />
      <main className="container-page pt-32 pb-16">
        <header>
          <h1 className="section-title">My petitions</h1>
          <p className="subtle mt-2">
            View petitions you created or accepted as an implementer.
          </p>
        </header>

        {!isConnected && (
          <p className="mt-6 card p-4 text-sm text-[#6B7280]">
            Connect your wallet to see personalized petitions.
          </p>
        )}

        {error && (
          <p className="mt-6 rounded-lg border border-[#EF4444]/40 bg-[#1f2937] px-4 py-3 text-sm text-[#EF4444]">
            {error}
          </p>
        )}

        <section className="mt-8">
          <h2 className="text-lg font-semibold">Created by me</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {createdByMe.map((petition) => (
              <div key={petition.petitionId} className="card p-5">
                <h3 className="text-base font-semibold">Petition #{petition.petitionId}</h3>
                <p className="subtle mt-2 text-sm">CID: {petition.contentCID}</p>
                <Link
                  href={`/petitions/${petition.petitionId}`}
                  className="btn-secondary mt-4 inline-flex"
                >
                  View
                </Link>
              </div>
            ))}
            {createdByMe.length === 0 && (
              <p className="subtle text-sm">No petitions created yet.</p>
            )}
          </div>
        </section>

        <section className="mt-10">
          <h2 className="text-lg font-semibold">Accepted as implementer</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {acceptedByMe.map((petition) => (
              <div key={petition.petitionId} className="card p-5">
                <h3 className="text-base font-semibold">Petition #{petition.petitionId}</h3>
                <p className="subtle mt-2 text-sm">CID: {petition.contentCID}</p>
                <Link
                  href={`/petitions/${petition.petitionId}`}
                  className="btn-secondary mt-4 inline-flex"
                >
                  View
                </Link>
              </div>
            ))}
            {acceptedByMe.length === 0 && (
              <p className="subtle text-sm">No petitions accepted yet.</p>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
