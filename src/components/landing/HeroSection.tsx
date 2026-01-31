import { useLanguage } from "../../i18n/LanguageContext";
import AvatarStage from "../AvatarStage";
import type { Companion } from "../../lib/companions";

interface HeroSectionProps {
  onChatOpen: () => void;
  companion: Companion;
}

export default function HeroSection({ onChatOpen, companion }: HeroSectionProps) {
  const { t } = useLanguage();
  const title = t("hero.title");

  return (
    <section className="hero-section" id="hero">
      <div className="hero-content">
        <h1>
          {title.includes("AI") ? (
            <>
              {title.split("AI")[0]}
              <span>AI</span>
              {title.split("AI")[1]}
            </>
          ) : (
            title
          )}
        </h1>
        <p>{t("hero.subtitle")}</p>
        <button className="hero-cta" onClick={onChatOpen}>
          {t("hero.cta")}
        </button>
      </div>
      <div className="hero-avatar-container">
        {/* Preview only — no lip sync, just idle */}
        <AvatarStage onReady={() => {}} vrmPath={companion.vrmFile} quality="preview" />
      </div>
    </section>
  );
}
