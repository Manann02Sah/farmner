import { useLanguage } from "@/contexts/LanguageContext";
import { Globe } from "lucide-react";

const LanguageToggle = () => {
  const { language, setLanguage } = useLanguage();

  return (
    <button
      onClick={() => setLanguage(language === "en" ? "hi" : "en")}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface-highest/40 hover:bg-surface-highest/60 transition-all text-sm font-medium"
      title={language === "en" ? "हिंदी में बदलें" : "Switch to English"}
    >
      <Globe className="w-4 h-4" />
      <span>{language === "en" ? "हिंदी" : "EN"}</span>
    </button>
  );
};

export default LanguageToggle;
