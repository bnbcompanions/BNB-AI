import { useLanguage } from "../../i18n/LanguageContext";

export default function Footer() {
  const { t } = useLanguage();

  return (
    <footer className="landing-footer">
      <div className="footer-brand">
        <h3>BNB AI</h3>
        <p>{t("footer.description")}</p>
      </div>
      <div className="footer-col">
        <h4>{t("footer.links")}</h4>
        <a href="#features">{t("nav.features")}</a>
        <a href="#tokenomics">{t("nav.tokenomics")}</a>
        <a href="#roadmap">{t("nav.roadmap")}</a>
      </div>
      <div className="footer-col">
        <h4>{t("footer.social")}</h4>
        <a href="#" target="_blank" rel="noopener noreferrer">Twitter</a>
        <a href="#" target="_blank" rel="noopener noreferrer">Telegram</a>
        <a href="#" target="_blank" rel="noopener noreferrer">GitHub</a>
      </div>
      <div className="footer-bottom">
        {t("footer.copyright")}
      </div>
    </footer>
  );
}
