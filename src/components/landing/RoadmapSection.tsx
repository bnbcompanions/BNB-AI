import { useLanguage } from "../../i18n/LanguageContext";

const QUARTERS = ["q1", "q2", "q3", "q4"];

export default function RoadmapSection() {
  const { t } = useLanguage();

  return (
    <section className="landing-section" id="roadmap">
      <h2 className="section-heading">{t("roadmap.heading")}</h2>
      <div className="roadmap-timeline">
        {QUARTERS.map((q) => (
          <div className="roadmap-item" key={q}>
            <h3>{t(`roadmap.${q}.title`)}</h3>
            <ul>
              {t(`roadmap.${q}.items`).split("\n").map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}
