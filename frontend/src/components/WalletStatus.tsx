"use client";

import { useMemo, useState } from "react";
import { useAccount, useConnect, useDisconnect } from "wagmi";

export function WalletStatus() {
  const { address, isConnected } = useAccount();
  const { connectors, connectAsync, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const [error, setError] = useState<string | null>(null);

  const injectedConnector = useMemo(
    () => connectors.find((item) => item.id === "injected") ?? connectors[0],
    [connectors],
  );
  const providerMissing =
    error?.toLowerCase().includes("provider not found") ||
    error?.toLowerCase().includes("connector not found");

  if (isConnected) {
    return (
      <div className="flex items-center gap-3">
        <span className="text-xs uppercase tracking-[0.2em] text-amber-200/80">
          {address?.slice(0, 6)}...{address?.slice(-4)}
        </span>
        <button
          type="button"
          onClick={() => disconnect()}
          className="rounded-full border border-white/20 px-4 py-2 text-xs uppercase tracking-[0.2em] text-white hover:border-white/50"
        >
          Disconnect
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <button
        type="button"
        onClick={async () => {
          setError(null);
          if (!injectedConnector) {
            setError("No injected connector available.");
            return;
          }
          try {
            await connectAsync({ connector: injectedConnector });
          } catch (err: unknown) {
            if (err instanceof Error) setError(err.message);
            else setError("Failed to connect wallet.");
          }
        }}
        disabled={isPending}
        className="rounded-full bg-white px-5 py-2 text-xs uppercase tracking-[0.2em] text-black hover:bg-amber-200"
      >
        {isPending ? "Connecting..." : "Connect Wallet"}
      </button>
      {providerMissing && (
        <a
          href="https://metamask.io/download/"
          target="_blank"
          rel="noreferrer"
          className="text-xs uppercase tracking-[0.2em] text-amber-200/80"
        >
          Install MetaMask
        </a>
      )}
      {error && <span className="text-xs text-red-200">{error}</span>}
    </div>
  );
}
