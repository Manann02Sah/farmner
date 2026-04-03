import { useMemo, useState } from "react";
import { ArrowLeft, ExternalLink, FileCheck, GitCompareArrows, Loader2, MapPin, ShieldCheck } from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import Footer from "@/components/Footer";
import DocumentVerifier from "@/components/DocumentVerifier";
import { SchemeRow, useSchemes } from "@/hooks/useSchemes";
import { useLanguage } from "@/contexts/LanguageContext";

const SchemeDetails = () => {
  const { schemeId } = useParams();
  const navigate = useNavigate();
  const { t, language } = useLanguage();
  const { data: schemes = [], isLoading } = useSchemes();
  const [verifyScheme, setVerifyScheme] = useState<SchemeRow | null>(null);

  const copy = useMemo(
    () =>
      language === "hi"
        ? {
            notFoundTitle: "\u092f\u094b\u091c\u0928\u093e \u0928\u0939\u0940\u0902 \u092e\u093f\u0932\u0940",
            notFoundDesc:
              "\u092e\u093e\u0902\u0917\u0940 \u0917\u0908 \u092f\u094b\u091c\u0928\u093e \u0915\u093e \u0935\u093f\u0935\u0930\u0923 \u0932\u094b\u0921 \u0928\u0939\u0940\u0902 \u0939\u094b \u0938\u0915\u093e\u0964 \u0915\u0943\u092a\u092f\u093e \u092f\u094b\u091c\u0928\u093e \u090f\u0915\u094d\u0938\u092a\u094d\u0932\u094b\u0930\u0930 \u092a\u0930 \u0935\u093e\u092a\u0938 \u091c\u093e\u0915\u0930 \u092b\u093f\u0930 \u0938\u0947 \u092a\u094d\u0930\u092f\u093e\u0938 \u0915\u0930\u0947\u0902\u0964",
            backToSchemes: "\u092f\u094b\u091c\u0928\u093e\u0913\u0902 \u092a\u0930 \u0935\u093e\u092a\u0938",
            quickActions: "\u0924\u094d\u0935\u0930\u093f\u0924 \u0915\u093e\u0930\u094d\u0930\u0935\u093e\u0908",
            compareThisScheme: "\u0907\u0938 \u092f\u094b\u091c\u0928\u093e \u0915\u0940 \u0924\u0941\u0932\u0928\u093e \u0915\u0930\u0947\u0902",
            officialWebsite: "\u0906\u0927\u093f\u0915\u093e\u0930\u093f\u0915 \u0935\u0947\u092c\u0938\u093e\u0907\u091f",
            eligibility: "\u092a\u093e\u0924\u094d\u0930\u0924\u093e",
            eligibilityFallback: "\u0907\u0938 \u092f\u094b\u091c\u0928\u093e \u0915\u0947 \u0932\u093f\u090f \u0905\u092d\u0940 \u092a\u093e\u0924\u094d\u0930\u0924\u093e \u0935\u093f\u0935\u0930\u0923 \u0909\u092a\u0932\u092c\u094d\u0927 \u0928\u0939\u0940\u0902 \u0939\u0948\u0964",
            snapshot: "\u092f\u094b\u091c\u0928\u093e \u0938\u094d\u0928\u0948\u092a\u0936\u0949\u091f",
            maxBenefit: "\u0905\u0927\u093f\u0915\u0924\u092e \u0932\u093e\u092d",
            applicationDeadline: "\u0906\u0935\u0947\u0926\u0928 \u0905\u0902\u0924\u093f\u092e \u0924\u093f\u0925\u093f",
            ministry: "\u092e\u0902\u0924\u094d\u0930\u093e\u0932\u092f",
            notSpecified: "\u0928\u093f\u0930\u094d\u0926\u093f\u0937\u094d\u091f \u0928\u0939\u0940\u0902",
            openOrNotSpecified: "\u0916\u0941\u0932\u093e \u0939\u0948 \u092f\u093e \u0928\u093f\u0930\u094d\u0926\u093f\u0937\u094d\u091f \u0928\u0939\u0940\u0902",
            benefits: "\u0932\u093e\u092d",
            benefitsFallback: "\u0907\u0938 \u092f\u094b\u091c\u0928\u093e \u0915\u0947 \u0932\u093f\u090f \u0905\u092d\u0940 \u0932\u093e\u092d \u0935\u093f\u0935\u0930\u0923 \u0909\u092a\u0932\u092c\u094d\u0927 \u0928\u0939\u0940\u0902 \u0939\u0948\u0964",
          }
        : {
            notFoundTitle: "Scheme not found",
            notFoundDesc:
              "The requested scheme details could not be loaded. Please go back to the scheme explorer and try again.",
            backToSchemes: "Back to schemes",
            quickActions: "Quick actions",
            compareThisScheme: "Compare this scheme",
            officialWebsite: "Official website",
            eligibility: "Eligibility",
            eligibilityFallback: "Eligibility details are not available yet for this scheme.",
            snapshot: "Program snapshot",
            maxBenefit: "Maximum benefit",
            applicationDeadline: "Application deadline",
            ministry: "Ministry",
            notSpecified: "Not specified",
            openOrNotSpecified: "Open or not specified",
            benefits: "Benefits",
            benefitsFallback: "Benefit details are not available yet for this scheme.",
          },
    [language],
  );

  const scheme = schemes.find((entry) => entry.id === schemeId);

  if (isLoading) {
    return (
      <div className="min-h-screen pt-20 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!scheme) {
    return (
      <div className="min-h-screen pt-20 flex items-center justify-center px-6">
        <div className="text-center max-w-lg">
          <h1 className="font-headline font-bold text-3xl mb-3">{copy.notFoundTitle}</h1>
          <p className="text-on-surface-variant mb-6">{copy.notFoundDesc}</p>
          <Link
            to="/schemes"
            className="gradient-primary text-primary-foreground font-medium px-6 py-3 rounded-lg inline-flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            {copy.backToSchemes}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-20 px-6 md:px-10">
      <div className="max-w-5xl mx-auto py-8">
        <Link to="/schemes" className="text-sm text-primary hover:underline inline-flex items-center gap-1 mb-6">
          <ArrowLeft className="w-4 h-4" />
          {t("compare.back")}
        </Link>

        <motion.section initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} className="bg-surface-container rounded-3xl p-6 md:p-8 ghost-border mb-8">
          <div className="flex flex-wrap gap-2 mb-4">
            <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-accent/10 text-accent">
              {scheme.category}
            </span>
            <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-primary/10 text-primary inline-flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              {scheme.state}
            </span>
            <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-surface-highest text-on-surface-variant">
              {scheme.benefit_type}
            </span>
          </div>

          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-3xl">
              <h1 className="font-headline font-extrabold text-4xl tracking-tight mb-3">{scheme.title}</h1>
              <p className="text-on-surface-variant text-base leading-relaxed">{scheme.description}</p>
            </div>

            <div className="w-full lg:max-w-sm bg-surface-high rounded-2xl p-5">
              <p className="text-[11px] uppercase tracking-wider text-on-surface-variant mb-2">{copy.quickActions}</p>
              <div className="space-y-3">
                <button
                  type="button"
                  onClick={() => navigate("/compare", { state: { schemeIds: [scheme.id] } })}
                  className="w-full ghost-border rounded-xl px-4 py-3 text-sm font-medium text-on-surface-variant hover:text-foreground inline-flex items-center justify-center gap-2"
                >
                  <GitCompareArrows className="w-4 h-4" />
                  {copy.compareThisScheme}
                </button>
                <button
                  type="button"
                  onClick={() => setVerifyScheme(scheme)}
                  className="w-full gradient-primary text-primary-foreground rounded-xl px-4 py-3 text-sm font-medium inline-flex items-center justify-center gap-2"
                >
                  <FileCheck className="w-4 h-4" />
                  {t("schemes.verifyDocs")}
                </button>
                {scheme.website_url && (
                  <a
                    href={scheme.website_url}
                    target="_blank"
                    rel="noreferrer"
                    className="w-full ghost-border rounded-xl px-4 py-3 text-sm font-medium text-on-surface-variant hover:text-foreground inline-flex items-center justify-center gap-2"
                  >
                    <ExternalLink className="w-4 h-4" />
                    {copy.officialWebsite}
                  </a>
                )}
              </div>
            </div>
          </div>
        </motion.section>

        <div className="grid lg:grid-cols-3 gap-6 mb-8">
          <motion.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="lg:col-span-2 bg-surface-container rounded-3xl p-6 ghost-border">
            <div className="flex items-center gap-2 mb-4">
              <ShieldCheck className="w-5 h-5 text-primary" />
              <h2 className="font-headline font-bold text-xl">{copy.eligibility}</h2>
            </div>
            <p className="text-sm text-on-surface-variant leading-relaxed">
              {scheme.eligibility || copy.eligibilityFallback}
            </p>
          </motion.section>

          <motion.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-surface-container rounded-3xl p-6 ghost-border">
            <p className="text-[11px] uppercase tracking-wider text-on-surface-variant mb-3">{copy.snapshot}</p>
            <div className="space-y-4">
              <div>
                <p className="text-xs text-on-surface-variant mb-1">{copy.maxBenefit}</p>
                <p className="text-sm font-semibold text-accent">{scheme.max_benefit || copy.notSpecified}</p>
              </div>
              <div>
                <p className="text-xs text-on-surface-variant mb-1">{copy.applicationDeadline}</p>
                <p className="text-sm font-semibold">{scheme.application_deadline || copy.openOrNotSpecified}</p>
              </div>
              <div>
                <p className="text-xs text-on-surface-variant mb-1">{copy.ministry}</p>
                <p className="text-sm font-semibold">{scheme.ministry || copy.notSpecified}</p>
              </div>
            </div>
          </motion.section>
        </div>

        <motion.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="bg-surface-container rounded-3xl p-6 ghost-border mb-10">
          <h2 className="font-headline font-bold text-xl mb-4">{copy.benefits}</h2>
          {scheme.benefits.length > 0 ? (
            <div className="grid md:grid-cols-2 gap-3">
              {scheme.benefits.map((benefit) => (
                <div key={benefit} className="rounded-2xl bg-surface-high p-4 text-sm text-foreground">
                  {benefit}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-on-surface-variant">{copy.benefitsFallback}</p>
          )}
        </motion.section>
      </div>

      <Footer />

      <AnimatePresence>
        {verifyScheme && (
          <DocumentVerifier scheme={verifyScheme} onClose={() => setVerifyScheme(null)} />
        )}
      </AnimatePresence>
    </div>
  );
};

export default SchemeDetails;
