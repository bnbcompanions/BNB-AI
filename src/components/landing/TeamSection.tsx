import { useLanguage } from "../../i18n/LanguageContext";

const MEMBERS = [
  { key: "member1", initials: "AC" },
  { key: "member2", initials: "SK" },
  { key: "member3", initials: "DL" },
  { key: "member4", initials: "MS" },
];

export default function TeamSection() {
  const { t } = useLanguage();

  return (
    <section className="landing-section" id="team">
      <h2 className="section-heading">{t("team.heading")}</h2>
      <div className="team-grid">
        {MEMBERS.map((m) => (
          <div className="team-card" key={m.key}>
            <div className="team-avatar">{m.initials}</div>
            <h3>{t(`team.${m.key}.name`)}</h3>
            <p>{t(`team.${m.key}.role`)}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
