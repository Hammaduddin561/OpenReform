"use client";

import Link from "next/link";
import { useState } from "react";
import { WalletStatus } from "@/components/WalletStatus";

export function Header() {
  const [query, setQuery] = useState("");

  return (
    <header className="fixed top-0 z-40 w-full border-b border-[#243043] bg-[#0b0f1a]">
      <div className="container-page flex h-16 items-center justify-between gap-4">
        <div className="flex items-center gap-8">
          <Link href="/" className="text-lg font-bold text-[#2563EB]">
            OpenReform
          </Link>
          <nav className="hidden items-center gap-6 text-sm text-[#6B7280] md:flex">
            <Link className="hover:text-white" href="/">
              Home
            </Link>
            <Link className="hover:text-white" href="/create">
              Create Petition
            </Link>
            <Link className="hover:text-white" href="/my-petitions">
              My Petitions
            </Link>
            <Link className="hover:text-white" href="/implementer">
              Implementer
            </Link>
            <Link className="hover:text-white" href="/demo">
              Demo Path
            </Link>
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden md:flex">
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search petitions"
              className="input-field w-52"
            />
          </div>
          <WalletStatus />
        </div>
      </div>
    </header>
  );
}
