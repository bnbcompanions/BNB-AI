import { useState } from "react";
import { useLanguage } from "../../i18n/LanguageContext";
import WalletButton from "../WalletButton";

interface NavbarProps {
  onChatOpen: () => void;
}

export default function Navbar({ onChatOpen }: NavbarProps) {
  const { lang, setLang, t } = useLanguage();
  const [menuOpen, setMenuOpen] = useState(false);

  const closeMenu = () => setMenuOpen(false);

  return (
    <nav className="navbar">
      <div className="navbar-logo">BNB AI</div>

      <button
        className={`navbar-hamburger${menuOpen ? " open" : ""}`}
        onClick={() => setMenuOpen((v) => !v)}
        aria-label="Toggle menu"
      >
        <span />
        <span />
        <span />
      </button>

      <ul className={`navbar-links${menuOpen ? " mobile-open" : ""}`}>
        <li><a href="#companions" onClick={closeMenu}>{t("nav.companions")}</a></li>
        <li><a href="#features" onClick={closeMenu}>{t("nav.features")}</a></li>
        <li><a href="#tokenomics" onClick={closeMenu}>{t("nav.tokenomics")}</a></li>
        <li><a href="#opensource" onClick={closeMenu}>{t("nav.opensource")}</a></li>
        <li><a href="#roadmap" onClick={closeMenu}>{t("nav.roadmap")}</a></li>
        <li>
          <button
            className="nav-lang-toggle"
            onClick={() => { setLang(lang === "en" ? "zh" : "en"); closeMenu(); }}
          >
            {lang === "en" ? "中文" : "EN"}
          </button>
        </li>
        <li><WalletButton /></li>
        <li>
          <button className="nav-chat-btn" onClick={() => { onChatOpen(); closeMenu(); }}>
            {t("nav.chat")}
          </button>
        </li>
      </ul>
    </nav>
  );
}
