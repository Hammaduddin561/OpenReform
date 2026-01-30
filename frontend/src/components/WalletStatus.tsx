"use client";

import { useAccount, useConnect, useDisconnect } from "wagmi";

export function WalletStatus() {
  const { address, isConnected } = useAccount();
  const { connectors, connectAsync, isPending } = useConnect();
  const { disconnect } = useDisconnect();

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
    <button
      type="button"
      onClick={async () => {
        const connector = connectors.find((item) => item.id === "injected") ?? connectors[0];
        if (!connector) return;
        await connectAsync({ connector });
      }}
      disabled={isPending}
      className="rounded-full bg-white px-5 py-2 text-xs uppercase tracking-[0.2em] text-black hover:bg-amber-200"
    >
      {isPending ? "Connecting..." : "Connect Wallet"}
    </button>
  );
}