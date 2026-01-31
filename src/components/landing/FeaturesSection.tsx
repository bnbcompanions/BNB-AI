import { useLanguage } from "../../i18n/LanguageContext";

const FEATURES = [
  { icon: "🤖", key: "ai" },
  { icon: "⛓️", key: "bnb" },
  { icon: "🎙️", key: "voice" },
  { icon: "🔒", key: "security" },
];

export default function FeaturesSection() {
  const { t } = useLanguage();

  return (
    <section className="landing-section" id="features">
      <h2 className="section-heading">
        {t("features.heading")}
      </h2>
      <div className="features-grid">
        {FEATURES.map((f) => (
          <div className="feature-card" key={f.key}>
            <div className="feature-icon">{f.icon}</div>
            <h3>{t(`features.${f.key}.title`)}</h3>
            <p>{t(`features.${f.key}.desc`)}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
