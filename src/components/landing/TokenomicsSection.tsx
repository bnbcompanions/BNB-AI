import { useLanguage } from "../../i18n/LanguageContext";

const TAX_ITEMS = [
  { key: "tax_maintenance", pct: 1 },
  { key: "tax_marketing", pct: 1 },
  { key: "tax_giveaway", pct: 1 },
];

export default function TokenomicsSection() {
  const { t } = useLanguage();

  return (
    <section className="landing-section" id="tokenomics">
      <h2 className="section-heading">{t("tokenomics.heading")}</h2>
      <div className="tokenomics-content">
        <h3 className="tokenomics-tax-title">{t("tokenomics.tax_title")}</h3>
        <div className="tokenomics-tax-grid">
          {TAX_ITEMS.map((item) => (
            <div className="tokenomics-tax-card" key={item.key}>
              <span className="tokenomics-tax-pct">{item.pct}%</span>
              <span className="tokenomics-tax-label">{t(`tokenomics.${item.key}`)}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
