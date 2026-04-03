import { useMemo, useState } from "react";
import {
  Zap,
  Upload,
  GitCompareArrows,
  PlusCircle,
  Bookmark,
  ChevronRight,
  Droplets,
  MilkOff,
  Settings2,
  HelpCircle,
  LayoutGrid,
  Languages,
  LogIn,
  Loader2,
  Leaf,
} from "lucide-react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import Sidebar from "@/components/Sidebar";
import Footer from "@/components/Footer";
import DocumentConverter from "@/components/DocumentConverter";
import CropHealthScanner from "@/components/CropHealthScanner";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useSavedSchemes } from "@/hooks/useSavedSchemes";

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.1, duration: 0.5 } }),
};

type DashboardTab = "overview" | "converter" | "crop-health";

const Dashboard = () => {
  const { user, loading } = useAuth();
  const { t, language } = useLanguage();
  const { data: savedSchemes = [], isLoading: savedLoading } = useSavedSchemes();
  const [activeTab, setActiveTab] = useState<DashboardTab>("overview");

  const newsItems = [t("dash.news1"), t("dash.news2"), t("dash.news3")];

  const copy = useMemo(
    () =>
      language === "hi"
        ? {
            converterTab: "\u0926\u0938\u094d\u0924\u093e\u0935\u0947\u091c\u093c \u0915\u0928\u094d\u0935\u0930\u094d\u091f\u0930",
            cropHealthTab: "\u0915\u094d\u0930\u0949\u092a \u0939\u0947\u0932\u094d\u0925 \u0938\u094d\u0915\u0948\u0928\u0930",
            overviewTab: "\u0905\u0935\u0932\u094b\u0915\u0928",
            openConverter: "\u0926\u0938\u094d\u0924\u093e\u0935\u0947\u091c\u093c \u0915\u0928\u094d\u0935\u0930\u094d\u091f\u0930 \u0916\u094b\u0932\u0947\u0902",
            converterHint: "OCR + \u0905\u0928\u0941\u0935\u093e\u0926",
            openCropScanner: "\u0915\u094d\u0930\u0949\u092a \u0939\u0947\u0932\u094d\u0925 \u0938\u094d\u0915\u0948\u0928\u0930 \u0916\u094b\u0932\u0947\u0902",
            cropScannerHint: "\u0932\u093e\u0907\u0935 \u0915\u0948\u092e\u0930\u093e + \u0930\u094b\u0917 \u0938\u0902\u0915\u0947\u0924",
            cropHealthTitle: "\u0915\u094d\u0930\u0949\u092a \u0939\u0947\u0932\u094d\u0925 \u0921\u0947\u0938\u094d\u0915",
            cropHealthDesc:
              "\u0932\u093e\u0907\u0935 \u092a\u0924\u094d\u0924\u0940 \u091c\u093e\u0902\u091a, \u091c\u094b\u0916\u093f\u092e \u0913\u0935\u0930\u0932\u0947 \u0914\u0930 \u0909\u092a\u093e\u092f \u0938\u093e\u0930\u093e\u0902\u0936",
            cropHealthAction: "\u0932\u093e\u0907\u0935 \u0938\u094d\u0915\u0948\u0928 \u0936\u0941\u0930\u0942 \u0915\u0930\u0947\u0902",
            cropHealthActionHint: "\u0915\u0948\u092e\u0930\u093e, \u0913\u0935\u0930\u0932\u0947, \u092f\u094b\u091c\u0928\u093e \u0932\u093f\u0902\u0915",
            eligibleStatus: "\u092a\u093e\u0924\u094d\u0930",
            savedStatus: "\u0938\u0939\u0947\u091c\u093e \u0917\u092f\u093e",
          }
        : {
            converterTab: "Document Converter",
            cropHealthTab: "Crop Health Scanner",
            overviewTab: "Overview",
            openConverter: "Open document converter",
            converterHint: "OCR + translation",
            openCropScanner: "Open crop health scanner",
            cropScannerHint: "Live camera + disease signals",
            cropHealthTitle: "Crop Health Desk",
            cropHealthDesc: "Live leaf analysis, risk overlays, and next-step advice",
            cropHealthAction: "Start live scan",
            cropHealthActionHint: "Camera, overlays, scheme links",
            eligibleStatus: "Eligible",
            savedStatus: "Saved",
          },
    [language],
  );

  const sidebarItems = [
    {
      icon: LayoutGrid,
      label: t("sidebar.overview"),
      active: activeTab === "overview",
      onClick: () => setActiveTab("overview"),
    },
    {
      icon: Languages,
      label: copy.converterTab,
      active: activeTab === "converter",
      onClick: () => setActiveTab("converter"),
    },
    {
      icon: Leaf,
      label: copy.cropHealthTab,
      active: activeTab === "crop-health",
      onClick: () => setActiveTab("crop-health"),
    },
  ];

  const getSavedStatusLabel = (status?: string) => {
    if (status === "eligible") {
      return copy.eligibleStatus;
    }

    if (status === "saved") {
      return copy.savedStatus;
    }

    return status || copy.savedStatus;
  };

  if (loading) {
    return (
      <div className="min-h-screen pt-20 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen pt-20 flex items-center justify-center px-6">
        <div className="text-center">
          <LogIn className="w-12 h-12 text-primary mx-auto mb-4" />
          <h2 className="font-headline font-bold text-2xl mb-2">{t("dash.signInRequired")}</h2>
          <p className="text-on-surface-variant mb-6">{t("dash.signInDesc")}</p>
          <Link to="/auth" className="gradient-primary text-primary-foreground font-headline font-bold px-8 py-3 rounded-lg inline-block">
            {t("nav.signIn")}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-20 flex">
      <Sidebar
        title={t("chat.title")}
        subtitle={t("dash.subtitle")}
        items={sidebarItems}
        bottomActions={
          <>
            <Link to="/schemes" className="block w-full gradient-primary text-primary-foreground font-headline font-bold py-3 rounded-lg text-sm text-center">
              {t("dash.startNewApp")}
            </Link>
            <div className="flex flex-col gap-1 mt-2">
              <button className="flex items-center gap-2 px-3 py-2 text-sm text-on-surface-variant hover:text-foreground">
                <Settings2 className="w-4 h-4" /> {t("common.settings")}
              </button>
              <button className="flex items-center gap-2 px-3 py-2 text-sm text-on-surface-variant hover:text-foreground">
                <HelpCircle className="w-4 h-4" /> {t("common.support")}
              </button>
            </div>
          </>
        }
      />

      <main className="flex-1 px-6 md:px-10 py-8">
        <div className="max-w-6xl">
          <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={0}>
            <h1 className="font-headline font-extrabold text-4xl tracking-tight mb-2">{t("dash.title")}</h1>
            <p className="text-on-surface-variant mb-8">
              {t("dash.welcome")}, {user.email?.split("@")[0]}. {t("dash.subtitle")}
            </p>
          </motion.div>

          <div className="flex flex-wrap gap-3 mb-8">
            <button
              type="button"
              onClick={() => setActiveTab("overview")}
              className={`rounded-full px-5 py-2.5 text-sm font-medium transition-all ${
                activeTab === "overview"
                  ? "bg-primary text-primary-foreground"
                  : "bg-surface-container text-on-surface-variant hover:text-foreground"
              }`}
            >
              {copy.overviewTab}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("converter")}
              className={`rounded-full px-5 py-2.5 text-sm font-medium transition-all ${
                activeTab === "converter"
                  ? "bg-primary text-primary-foreground"
                  : "bg-surface-container text-on-surface-variant hover:text-foreground"
              }`}
            >
              {copy.converterTab}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("crop-health")}
              className={`rounded-full px-5 py-2.5 text-sm font-medium transition-all ${
                activeTab === "crop-health"
                  ? "bg-primary text-primary-foreground"
                  : "bg-surface-container text-on-surface-variant hover:text-foreground"
              }`}
            >
              {copy.cropHealthTab}
            </button>
          </div>

          {activeTab === "overview" ? (
            <>
              <div className="grid lg:grid-cols-5 gap-6 mb-8">
                <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={1} className="lg:col-span-3 bg-surface-container rounded-2xl p-6 ghost-border">
                  <div className="flex items-center gap-2 mb-4">
                    <Zap className="w-5 h-5 text-accent" />
                    <h2 className="font-headline font-bold text-lg">{t("dash.aiNews")}</h2>
                  </div>
                  <ul className="space-y-3">
                    {newsItems.map((news, i) => (
                      <li key={i} className="flex items-start gap-3 text-sm text-foreground leading-relaxed">
                        <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
                        {news}
                      </li>
                    ))}
                  </ul>
                </motion.div>

                <motion.button
                  type="button"
                  initial="hidden"
                  animate="visible"
                  variants={fadeUp}
                  custom={2}
                  onClick={() => setActiveTab("converter")}
                  className="lg:col-span-2 bg-surface-container rounded-2xl p-6 ghost-border text-left"
                >
                  <h2 className="font-headline font-bold text-lg mb-1">{t("dash.docHub")}</h2>
                  <p className="text-xs text-on-surface-variant mb-5">{t("dash.docHubDesc")}</p>
                  <div className="border-2 border-dashed border-outline-variant/30 rounded-2xl p-8 flex flex-col items-center justify-center text-center hover:border-primary/30 transition-colors cursor-pointer">
                    <Upload className="w-8 h-8 text-on-surface-variant mb-3" />
                    <p className="font-medium text-sm mb-1">{copy.openConverter}</p>
                    <p className="text-xs text-on-surface-variant uppercase tracking-wider">
                      {copy.converterHint}
                    </p>
                  </div>
                </motion.button>
              </div>

              <div className="grid lg:grid-cols-5 gap-6 mb-8">
                <motion.button
                  type="button"
                  initial="hidden"
                  animate="visible"
                  variants={fadeUp}
                  custom={3}
                  onClick={() => setActiveTab("crop-health")}
                  className="lg:col-span-2 bg-surface-container rounded-2xl p-6 ghost-border text-left"
                >
                  <h2 className="font-headline font-bold text-lg mb-1">{copy.cropHealthTitle}</h2>
                  <p className="text-xs text-on-surface-variant mb-5">{copy.cropHealthDesc}</p>
                  <div className="border-2 border-dashed border-outline-variant/30 rounded-2xl p-8 flex flex-col items-center justify-center text-center hover:border-primary/30 transition-colors cursor-pointer">
                    <Leaf className="w-8 h-8 text-primary mb-3" />
                    <p className="font-medium text-sm mb-1">{copy.cropHealthAction}</p>
                    <p className="text-xs text-on-surface-variant uppercase tracking-wider">
                      {copy.cropHealthActionHint}
                    </p>
                  </div>
                </motion.button>

                <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={4} className="lg:col-span-3 grid grid-cols-3 gap-4">
                  {[
                    {
                      icon: Upload,
                      label: t("dash.uploadDoc"),
                      color: "text-primary",
                      onClick: () => setActiveTab("converter"),
                    },
                    { icon: GitCompareArrows, label: t("dash.compareSchemes"), color: "text-accent", to: "/schemes" },
                    { icon: PlusCircle, label: t("dash.newApplication"), color: "text-accent", to: "/schemes" },
                  ].map((action) =>
                    "to" in action ? (
                      <Link key={action.label} to={action.to} className="bg-surface-container rounded-2xl p-5 ghost-border flex flex-col items-center gap-3 hover:bg-surface-high transition-colors group">
                        <action.icon className={`w-6 h-6 ${action.color} group-hover:scale-110 transition-transform`} />
                        <span className="text-sm font-medium text-center">{action.label}</span>
                      </Link>
                    ) : (
                      <button
                        key={action.label}
                        type="button"
                        onClick={action.onClick}
                        className="bg-surface-container rounded-2xl p-5 ghost-border flex flex-col items-center gap-3 hover:bg-surface-high transition-colors group"
                      >
                        <action.icon className={`w-6 h-6 ${action.color} group-hover:scale-110 transition-transform`} />
                        <span className="text-sm font-medium text-center">{action.label}</span>
                      </button>
                    ),
                  )}
                </motion.div>
              </div>

              <div className="grid lg:grid-cols-5 gap-6 mb-8">
                <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={5} className="lg:col-span-3">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="font-headline font-bold text-xl">{t("dash.savedSchemes")}</h2>
                    <Link to="/schemes" className="text-xs text-on-surface-variant uppercase tracking-wider hover:text-primary transition-colors">
                      {t("dash.browseAll")}
                    </Link>
                  </div>
                  {savedLoading ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="w-6 h-6 animate-spin text-primary" />
                    </div>
                  ) : savedSchemes.length === 0 ? (
                    <div className="bg-surface-container rounded-2xl p-8 ghost-border text-center">
                      <Bookmark className="w-8 h-8 text-on-surface-variant mx-auto mb-3" />
                      <p className="text-on-surface-variant text-sm mb-4">{t("dash.noSaved")}</p>
                      <Link to="/schemes" className="gradient-primary text-primary-foreground font-medium px-5 py-2 rounded-lg text-sm inline-block">
                        {t("dash.exploreSchemes")}
                      </Link>
                    </div>
                  ) : (
                    <div className="grid sm:grid-cols-2 gap-4">
                      {savedSchemes.slice(0, 4).map((saved: any) => (
                        <div key={saved.id} className="bg-surface-container rounded-2xl p-5 ghost-border hover:bg-surface-high transition-colors">
                          <div className="flex items-center justify-between mb-3">
                            <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${saved.status === "eligible" ? "bg-accent/10 text-accent" : "bg-primary/10 text-primary"}`}>
                              {getSavedStatusLabel(saved.status)}
                            </span>
                            <Bookmark className="w-4 h-4 text-primary" fill="currentColor" />
                          </div>
                          <h3 className="font-headline font-bold text-base mb-1">{saved.schemes?.title}</h3>
                          <p className="text-xs text-on-surface-variant mb-4 line-clamp-2">{saved.schemes?.description}</p>
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-bold text-accent">{saved.schemes?.max_benefit || t("common.viewDetails")}</span>
                            <ChevronRight className="w-4 h-4 text-on-surface-variant" />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </motion.div>

                <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={6} className="lg:col-span-2 bg-surface-container rounded-2xl p-6 ghost-border">
                  <div className="flex items-center gap-2 mb-5">
                    <Zap className="w-5 h-5 text-primary" />
                    <h2 className="font-headline font-bold text-lg">{t("dash.aiRec")}</h2>
                  </div>
                  <div className="space-y-4 mb-5">
                    {[
                      { icon: Droplets, title: t("dash.microIrrigation"), desc: t("dash.microIrrigationDesc"), color: "bg-primary/10 text-primary" },
                      { icon: MilkOff, title: t("dash.livestock"), desc: t("dash.livestockDesc"), color: "bg-accent/10 text-accent" },
                    ].map((item, index) => (
                      <div key={index} className="flex items-start gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${item.color}`}>
                          <item.icon className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="font-medium text-sm">{item.title}</p>
                          <p className="text-xs text-on-surface-variant">{item.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  <Link to="/chat" className="block w-full py-2.5 rounded-xl ghost-border text-sm font-medium text-on-surface-variant hover:text-foreground hover:bg-surface-bright/40 transition-all text-center">
                    {t("dash.talkAI")}
                  </Link>
                </motion.div>
              </div>
            </>
          ) : activeTab === "converter" ? (
            <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={1}>
              <DocumentConverter />
            </motion.div>
          ) : (
            <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={1}>
              <CropHealthScanner />
            </motion.div>
          )}
        </div>
        <Footer />
      </main>
    </div>
  );
};

export default Dashboard;
