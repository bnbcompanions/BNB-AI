import COMPANIONS from "../../lib/companions";
import { useLanguage } from "../../i18n/LanguageContext";

interface CompanionSelectorProps {
  activeId: string;
  onSelect: (id: string) => void;
}

export default function CompanionSelector({ activeId, onSelect }: CompanionSelectorProps) {
  const { lang, t } = useLanguage();

  return (
    <section className="landing-section" id="companions">
      <h2 className="section-heading">{t("companions.heading")}</h2>
      <p className="companions-subtitle">{t("companions.subtitle")}</p>
      <div className="companions-grid">
        {COMPANIONS.map((c) => (
          <button
            key={c.id}
            className={`companion-card${c.id === activeId ? " active" : ""}`}
            onClick={() => onSelect(c.id)}
          >
            <div className="companion-avatar-circle">
              {c.name[lang].charAt(0)}
            </div>
            <h3>{c.name[lang]}</h3>
            <p>{c.role[lang]}</p>
            {c.id === activeId && <div className="companion-active-badge">{t("companions.active")}</div>}
          </button>
        ))}
      </div>
    </section>
  );
}
