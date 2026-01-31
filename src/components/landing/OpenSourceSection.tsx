import { useLanguage } from "../../i18n/LanguageContext";

const REPO_URL = "https://github.com/bnbcompanions/bnbaiq";

export default function OpenSourceSection() {
  const { t } = useLanguage();

  return (
    <section className="landing-section opensource-section" id="opensource">
      <div className="opensource-badge">&lt;/&gt;</div>
      <h2 className="section-heading">{t("opensource.heading")}</h2>
      <p className="opensource-desc">{t("opensource.description")}</p>
      <div className="opensource-highlights">
        <div className="opensource-highlight-item">
          <span className="opensource-highlight-icon">&#128270;</span>
          <span>{t("opensource.transparent")}</span>
        </div>
        <div className="opensource-highlight-item">
          <span className="opensource-highlight-icon">&#129309;</span>
          <span>{t("opensource.community")}</span>
        </div>
        <div className="opensource-highlight-item">
          <span className="opensource-highlight-icon">&#128737;</span>
          <span>{t("opensource.auditable")}</span>
        </div>
      </div>
      <a
        href={REPO_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="opensource-repo-btn"
      >
        <svg className="opensource-gh-icon" viewBox="0 0 16 16" width="18" height="18" fill="currentColor">
          <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38
            0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52
            -.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2
            -3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82
            .64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92
            .08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0
            1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
        </svg>
        {t("opensource.view_repo")}
      </a>
    </section>
  );
}
