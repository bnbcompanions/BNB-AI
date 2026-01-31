import { useState, useRef, useEffect } from "react";
import { useWallet, SUPPORTED_CHAINS } from "../lib/wallet";
import { useLanguage } from "../i18n/LanguageContext";

export default function WalletButton() {
  const { address, shortAddress, currentChain, connecting, error, connect, disconnect, switchChain } = useWallet();
  const { t } = useLanguage();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu on outside click
  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [menuOpen]);

  if (!address) {
    return (
      <button
        className="wallet-connect-btn"
        onClick={connect}
        disabled={connecting}
      >
        {connecting ? t("wallet.connecting") : t("wallet.connect")}
        {error === "no_wallet" && (
          <span className="wallet-error-tooltip">{t("wallet.no_provider")}</span>
        )}
      </button>
    );
  }

  return (
    <div className="wallet-connected" ref={menuRef}>
      <button className="wallet-address-btn" onClick={() => setMenuOpen((v) => !v)}>
        {currentChain && <span className="wallet-chain-badge">{currentChain.symbol}</span>}
        <span>{shortAddress}</span>
      </button>

      {menuOpen && (
        <div className="wallet-dropdown">
          <div className="wallet-dropdown-header">
            <span className="wallet-dropdown-addr">{shortAddress}</span>
            {currentChain && <span className="wallet-dropdown-chain">{currentChain.chainName}</span>}
          </div>

          <div className="wallet-dropdown-section">
            <span className="wallet-dropdown-label">{t("wallet.switch_chain")}</span>
            {SUPPORTED_CHAINS.map((chain) => (
              <button
                key={chain.chainId}
                className={`wallet-chain-option${chain.chainId === currentChain?.chainId ? " active" : ""}`}
                onClick={() => { switchChain(chain.chainId); setMenuOpen(false); }}
              >
                <span>{chain.chainName}</span>
                <span className="wallet-chain-symbol">{chain.symbol}</span>
              </button>
            ))}
          </div>

          <button className="wallet-disconnect-btn" onClick={() => { disconnect(); setMenuOpen(false); }}>
            {t("wallet.disconnect")}
          </button>
        </div>
      )}
    </div>
  );
}
