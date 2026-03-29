import { useState, useCallback, useEffect } from "react";

declare global {
  interface Window {
    ethereum?: {
      isMetaMask?: boolean;
      request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
      on: (event: string, handler: (...args: unknown[]) => void) => void;
      removeListener: (event: string, handler: (...args: unknown[]) => void) => void;
    };
  }
}

export const useWallet = () => {
  const [address, setAddress] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [chainId, setChainId] = useState<string | null>(null);

  const shortAddress = address ? `${address.slice(0, 6)}...${address.slice(-4)}` : null;

  const connect = useCallback(async () => {
    if (!window.ethereum) {
      window.open("https://metamask.io/download/", "_blank");
      return;
    }
    setIsConnecting(true);
    try {
      const accounts = (await window.ethereum.request({ method: "eth_requestAccounts" })) as string[];
      if (accounts[0]) setAddress(accounts[0]);
      const chain = (await window.ethereum.request({ method: "eth_chainId" })) as string;
      setChainId(chain);
    } catch (e) {
      console.error("Wallet connect error:", e);
    }
    setIsConnecting(false);
  }, []);

  const disconnect = useCallback(() => {
    setAddress(null);
    setChainId(null);
  }, []);

  useEffect(() => {
    if (!window.ethereum) return;
    const handleAccounts = (accounts: unknown) => {
      const accs = accounts as string[];
      setAddress(accs[0] || null);
    };
    const handleChain = (chain: unknown) => setChainId(chain as string);
    window.ethereum.on("accountsChanged", handleAccounts);
    window.ethereum.on("chainChanged", handleChain);
    // Check if already connected
    window.ethereum.request({ method: "eth_accounts" }).then((accs) => {
      const accounts = accs as string[];
      if (accounts[0]) {
        setAddress(accounts[0]);
        window.ethereum!.request({ method: "eth_chainId" }).then((c) => setChainId(c as string));
      }
    });
    return () => {
      window.ethereum!.removeListener("accountsChanged", handleAccounts);
      window.ethereum!.removeListener("chainChanged", handleChain);
    };
  }, []);

  return { address, shortAddress, isConnecting, chainId, connect, disconnect, isConnected: !!address };
};
