import { useLocation, Link } from "react-router-dom";
import { useSchemes } from "@/hooks/useSchemes";
import { useLanguage } from "@/contexts/LanguageContext";
import { motion } from "framer-motion";
import { Check, X, ArrowLeft } from "lucide-react";
import Footer from "@/components/Footer";

const SchemeCompare = () => {
  const { t } = useLanguage();
  const location = useLocation();
  const ids: string[] = location.state?.schemeIds || [];
  const { data: allSchemes = [] } = useSchemes();

  const schemes = allSchemes.filter((s) => ids.includes(s.id));

  if (schemes.length < 2) {
    return (
      <div className="min-h-screen pt-20 flex items-center justify-center px-6">
        <div className="text-center">
          <h2 className="font-headline font-bold text-2xl mb-4">{t("compare.title")}</h2>
          <p className="text-on-surface-variant mb-6">
            {t("schemes.subtitle")}. Please select at least 2 schemes to compare.
          </p>
          <Link to="/schemes" className="gradient-primary text-primary-foreground font-medium px-6 py-3 rounded-lg inline-flex items-center gap-2">
            <ArrowLeft className="w-4 h-4" /> {t("compare.back")}
          </Link>
        </div>
      </div>
    );
  }

  const rows = [
    { label: t("compare.category"), key: "category" },
    { label: t("compare.state"), key: "state" },
    { label: t("compare.benefitType"), key: "benefit_type" },
    { label: t("compare.maxBenefit"), key: "max_benefit" },
    { label: t("compare.ministry"), key: "ministry" },
    { label: t("compare.eligibility"), key: "eligibility" },
  ];

  return (
    <div className="min-h-screen pt-20 px-6 md:px-10">
      <div className="max-w-5xl mx-auto py-8">
        <Link to="/schemes" className="text-sm text-primary hover:underline mb-6 inline-flex items-center gap-1">
          <ArrowLeft className="w-4 h-4" /> {t("compare.back")}
        </Link>

        <motion.h1 initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="font-headline font-extrabold text-3xl mb-8">
          {t("compare.title")}
        </motion.h1>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="text-left p-4 text-sm font-medium text-on-surface-variant w-40"></th>
                {schemes.map((s) => (
                  <th key={s.id} className="p-4 text-left">
                    <div className="bg-surface-container rounded-xl p-4 ghost-border">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-primary/10 text-primary">
                        {s.category}
                      </span>
                      <h3 className="font-headline font-bold text-base mt-2">{s.title}</h3>
                      <p className="text-xs text-on-surface-variant mt-1 line-clamp-2">{s.description}</p>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={row.key} className={i % 2 === 0 ? "bg-surface-container/30" : ""}>
                  <td className="p-4 text-sm font-medium text-on-surface-variant">{row.label}</td>
                  {schemes.map((s) => (
                    <td key={s.id} className="p-4 text-sm">{(s as any)[row.key] || "—"}</td>
                  ))}
                </tr>
              ))}
              <tr className="bg-surface-container/30">
                <td className="p-4 text-sm font-medium text-on-surface-variant">{t("compare.benefits")}</td>
                {schemes.map((s) => (
                  <td key={s.id} className="p-4">
                    <ul className="space-y-1">
                      {(s.benefits || []).map((b, j) => (
                        <li key={j} className="flex items-start gap-2 text-sm">
                          <Check className="w-4 h-4 text-accent flex-shrink-0 mt-0.5" />
                          <span>{b}</span>
                        </li>
                      ))}
                      {(!s.benefits || s.benefits.length === 0) && <span className="text-on-surface-variant text-sm">—</span>}
                    </ul>
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default SchemeCompare;
