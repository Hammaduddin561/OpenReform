"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import { useAccount, useChainId, useConnect, useDisconnect, useSwitchChain } from "wagmi";
import { sepolia } from "wagmi/chains";

export function WalletStatus() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { connectors, connectAsync, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChainAsync, isPending: isSwitching } = useSwitchChain();
  const [error, setError] = useState<string | null>(null);

  const subscribe = () => () => {};
  const isMounted = useSyncExternalStore(subscribe, () => true, () => false);
  const hasProvider = useSyncExternalStore(
    subscribe,
    () => typeof window !== "undefined" && Boolean((window as Window & { ethereum?: unknown }).ethereum),
    () => false,
  );

  const injectedConnector = useMemo(
    () => connectors.find((item) => item.id === "injected") ?? connectors[0],
    [connectors],
  );
  const providerMissing =
    error?.toLowerCase().includes("provider not found") ||
    error?.toLowerCase().includes("connector not found");

  if (!isMounted) {
    return (
      <div className="flex flex-col items-start gap-2">
        <button type="button" disabled className="btn-secondary">
          Connect Wallet
        </button>
      </div>
    );
  }

  if (isConnected) {
    return (
      <div className="flex flex-col items-start gap-2">
        <div className="flex items-center gap-3">
          <span className="text-xs uppercase tracking-[0.2em] text-[#6B7280]">
            {address?.slice(0, 6)}...{address?.slice(-4)}
          </span>
          <button type="button" onClick={() => disconnect()} className="btn-secondary">
            Disconnect
          </button>
        </div>
        {chainId !== sepolia.id && (
          <button
            type="button"
            onClick={async () => {
              try {
                await switchChainAsync({ chainId: sepolia.id });
              } catch (err) {
                if (err instanceof Error) setError(err.message);
              }
            }}
            className="btn-primary"
            disabled={isSwitching}
          >
            {isSwitching ? "Switching..." : "Switch to Sepolia"}
          </button>
        )}
        {chainId === sepolia.id && (
          <span className="text-xs uppercase tracking-[0.2em] text-[#10B981]">
            Sepolia connected
          </span>
        )}
        {error && <span className="text-xs text-[#EF4444]">{error}</span>}
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
        className="btn-primary"
      >
        {isPending ? "Connecting..." : "Connect Wallet"}
      </button>
      {providerMissing && (
        <a
          href="https://metamask.io/download/"
          target="_blank"
          rel="noreferrer"
          className="text-xs uppercase tracking-[0.2em] text-[#6B7280]"
        >
          Install MetaMask
        </a>
      )}
      {!providerMissing && !hasProvider && (
        <span className="text-xs uppercase tracking-[0.2em] text-[#6B7280]">
          Provider unavailable
        </span>
      )}
      {error && <span className="text-xs text-[#EF4444]">{error}</span>}
    </div>
  );
}