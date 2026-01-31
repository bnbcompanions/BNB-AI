import { useState } from "react";
import { useLanguage, hasLanguagePreference } from "../i18n/LanguageContext";
import "../styles/splash.css";

export default function LanguageSplash() {
  const { setLang } = useLanguage();
  const [visible, setVisible] = useState(!hasLanguagePreference());
  const [fading, setFading] = useState(false);

  if (!visible) return null;

  const pick = (lang: "en" | "zh") => {
    setLang(lang);
    setFading(true);
    setTimeout(() => setVisible(false), 500);
  };

  return (
    <div className={`splash-overlay${fading ? " fade-out" : ""}`}>
      <div className="splash-title">Select Language / 选择语言</div>
      <div className="splash-buttons">
        <button className="splash-btn" onClick={() => pick("en")}>
          English
        </button>
        <button className="splash-btn" onClick={() => pick("zh")}>
          中文
        </button>
      </div>
    </div>
  );
}
