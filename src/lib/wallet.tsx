import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";

/* ─── Supported EVM chains (no Solana) ─── */
export interface ChainInfo {
  chainId: string;   // hex
  chainName: string;
  symbol: string;
  rpcUrl: string;
  explorer: string;
}

export const SUPPORTED_CHAINS: ChainInfo[] = [
  {
    chainId: "0x38",
    chainName: "BNB Smart Chain",
    symbol: "BNB",
    rpcUrl: "https://bsc-dataseed.binance.org/",
    explorer: "https://bscscan.com",
  },
  {
    chainId: "0x1",
    chainName: "Ethereum",
    symbol: "ETH",
    rpcUrl: "https://eth.llamarpc.com",
    explorer: "https://etherscan.io",
  },
  {
    chainId: "0x89",
    chainName: "Polygon",
    symbol: "MATIC",
    rpcUrl: "https://polygon-rpc.com/",
    explorer: "https://polygonscan.com",
  },
  {
    chainId: "0xa4b1",
    chainName: "Arbitrum One",
    symbol: "ETH",
    rpcUrl: "https://arb1.arbitrum.io/rpc",
    explorer: "https://arbiscan.io",
  },
  {
    chainId: "0xa",
    chainName: "Optimism",
    symbol: "ETH",
    rpcUrl: "https://mainnet.optimism.io",
    explorer: "https://optimistic.etherscan.io",
  },
];

/* ─── Types ─── */
interface WalletState {
  address: string | null;
  chainId: string | null;
  connecting: boolean;
  error: string | null;
}

interface WalletContextValue extends WalletState {
  connect: () => Promise<void>;
  disconnect: () => void;
  switchChain: (chainId: string) => Promise<void>;
  shortAddress: string;
  currentChain: ChainInfo | null;
}

const WalletContext = createContext<WalletContextValue | null>(null);

const LS_WALLET_KEY = "bnbai_wallet_connected";

/* ─── Helpers ─── */
function shortenAddress(addr: string): string {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

function getEthereum(): any | null {
  return typeof window !== "undefined" ? (window as any).ethereum : null;
}

/* ─── Provider ─── */
export function WalletProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<WalletState>({
    address: null,
    chainId: null,
    connecting: false,
    error: null,
  });

  const setAddress = useCallback((address: string | null, chainId?: string | null) => {
    setState((s) => ({
      ...s,
      address,
      chainId: chainId ?? s.chainId,
      connecting: false,
      error: null,
    }));
    if (address) {
      try { localStorage.setItem(LS_WALLET_KEY, "true"); } catch { /* */ }
    } else {
      try { localStorage.removeItem(LS_WALLET_KEY); } catch { /* */ }
    }
  }, []);

  const connect = useCallback(async () => {
    const ethereum = getEthereum();
    if (!ethereum) {
      setState((s) => ({ ...s, error: "no_wallet" }));
      return;
    }

    setState((s) => ({ ...s, connecting: true, error: null }));
    try {
      const accounts: string[] = await ethereum.request({ method: "eth_requestAccounts" });
      const chainId: string = await ethereum.request({ method: "eth_chainId" });
      if (accounts.length > 0) {
        setAddress(accounts[0], chainId);
      }
    } catch (err: any) {
      setState((s) => ({ ...s, connecting: false, error: err?.code === 4001 ? "rejected" : "error" }));
    }
  }, [setAddress]);

  const disconnect = useCallback(() => {
    setAddress(null, null);
  }, [setAddress]);

  const switchChain = useCallback(async (chainId: string) => {
    const ethereum = getEthereum();
    if (!ethereum) return;

    try {
      await ethereum.request({ method: "wallet_switchEthereumChain", params: [{ chainId }] });
    } catch (err: any) {
      // 4902 = chain not added yet
      if (err?.code === 4902) {
        const chain = SUPPORTED_CHAINS.find((c) => c.chainId === chainId);
        if (chain) {
          await ethereum.request({
            method: "wallet_addEthereumChain",
            params: [{
              chainId: chain.chainId,
              chainName: chain.chainName,
              nativeCurrency: { name: chain.symbol, symbol: chain.symbol, decimals: 18 },
              rpcUrls: [chain.rpcUrl],
              blockExplorerUrls: [chain.explorer],
            }],
          });
        }
      }
    }
  }, []);

  // Listen for account/chain changes
  useEffect(() => {
    const ethereum = getEthereum();
    if (!ethereum) return;

    const handleAccountsChanged = (accounts: string[]) => {
      if (accounts.length === 0) {
        setAddress(null, null);
      } else {
        setAddress(accounts[0]);
      }
    };

    const handleChainChanged = (chainId: string) => {
      setState((s) => ({ ...s, chainId }));
    };

    ethereum.on("accountsChanged", handleAccountsChanged);
    ethereum.on("chainChanged", handleChainChanged);

    return () => {
      ethereum.removeListener("accountsChanged", handleAccountsChanged);
      ethereum.removeListener("chainChanged", handleChainChanged);
    };
  }, [setAddress]);

  // Auto-reconnect if previously connected
  useEffect(() => {
    const wasConnected = localStorage.getItem(LS_WALLET_KEY);
    if (!wasConnected) return;

    const ethereum = getEthereum();
    if (!ethereum) return;

    (async () => {
      try {
        const accounts: string[] = await ethereum.request({ method: "eth_accounts" });
        const chainId: string = await ethereum.request({ method: "eth_chainId" });
        if (accounts.length > 0) {
          setAddress(accounts[0], chainId);
        }
      } catch { /* silent */ }
    })();
  }, [setAddress]);

  const currentChain = SUPPORTED_CHAINS.find((c) => c.chainId === state.chainId) ?? null;
  const shortAddress = state.address ? shortenAddress(state.address) : "";

  return (
    <WalletContext.Provider value={{ ...state, connect, disconnect, switchChain, shortAddress, currentChain }}>
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet(): WalletContextValue {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error("useWallet must be used within WalletProvider");
  return ctx;
}
