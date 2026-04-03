import { useLanguage } from "@/contexts/LanguageContext";

const Footer = () => {
  const { t } = useLanguage();

  return (
    <footer className="border-t border-outline-variant/10 py-8 px-8">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
        <p className="text-xs text-on-surface-variant uppercase tracking-wider">
          {t("footer.copyright")}
        </p>
        <div className="flex gap-6 text-xs text-on-surface-variant uppercase tracking-wider">
          <span className="hover:text-foreground cursor-pointer transition-colors">{t("footer.accessibility")}</span>
          <span className="hover:text-foreground cursor-pointer transition-colors">{t("footer.privacy")}</span>
          <span className="hover:text-foreground cursor-pointer transition-colors">{t("footer.terms")}</span>
          <span className="hover:text-foreground cursor-pointer transition-colors">{t("footer.contact")}</span>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
