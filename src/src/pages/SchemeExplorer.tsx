import { useState, useMemo } from "react";
import { Search, Bookmark, Check, Sparkles, Loader2, FileCheck, GitCompareArrows, ChevronRight } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import Sidebar from "@/components/Sidebar";
import Footer from "@/components/Footer";
import DocumentVerifier from "@/components/DocumentVerifier";
import { useSchemes, useSchemeCategories, useSchemeStates, SchemeRow } from "@/hooks/useSchemes";
import { useSavedSchemes, useSaveScheme, useUnsaveScheme } from "@/hooks/useSavedSchemes";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { LayoutGrid, FileText, BookmarkCheck, FileBox, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

const benefitTypes = ["Direct Cash", "Subsidies", "Credit & Loan", "Insurance"];

const ITEMS_PER_PAGE = 12;

const SchemeExplorer = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All Categories");
  const [selectedState, setSelectedState] = useState("All States");
  const [activeBenefitTypes, setActiveBenefitTypes] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [selectedSchemes, setSelectedSchemes] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [verifyScheme, setVerifyScheme] = useState<SchemeRow | null>(null);
  const navigate = useNavigate();

  const { user } = useAuth();
  const { t } = useLanguage();
  const { data: schemes = [], isLoading } = useSchemes({
    category: selectedCategory,
    state: selectedState,
    search: searchQuery || undefined,
  });
  const { data: categories = [] } = useSchemeCategories();
  const { data: states = [] } = useSchemeStates();
  const { data: savedSchemes = [] } = useSavedSchemes();
  const saveScheme = useSaveScheme();
  const unsaveScheme = useUnsaveScheme();

  const savedSchemeIds = useMemo(
    () => new Set(savedSchemes.map((s: any) => s.scheme_id)),
    [savedSchemes]
  );

  const filteredSchemes = useMemo(() => {
    let result = schemes;
    if (activeBenefitTypes.length > 0) {
      result = result.filter((s) => activeBenefitTypes.includes(s.benefit_type));
    }
    return result;
  }, [schemes, activeBenefitTypes]);

  const totalPages = Math.ceil(filteredSchemes.length / ITEMS_PER_PAGE);
  const paginatedSchemes = filteredSchemes.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  const toggleBenefitType = (type: string) => {
    setActiveBenefitTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
    setPage(1);
  };

  const toggleSchemeSelection = (id: string) => {
    setSelectedSchemes((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : prev.length < 3 ? [...prev, id] : prev
    );
  };

  const handleSaveToggle = (schemeId: string) => {
    if (!user) {
      toast.error(t("schemes.signInToSave"));
      return;
    }
    if (savedSchemeIds.has(schemeId)) {
      unsaveScheme.mutate(schemeId);
      toast.success(t("schemes.removed"));
    } else {
      saveScheme.mutate(schemeId);
      toast.success(t("schemes.saved"));
    }
  };

  const handleCompare = () => {
    if (selectedSchemes.length < 2) {
      toast.error(t("schemes.selectAtLeast2"));
      return;
    }
    navigate("/compare", { state: { schemeIds: selectedSchemes } });
  };

  const sidebarItems = [
    { icon: LayoutGrid, label: t("nav.schemes"), path: "/schemes" },
    { icon: FileText, label: t("nav.dashboard"), path: "/dashboard" },
    { icon: ShieldCheck, label: t("schemes.verifyDocs"), path: "/schemes" },
    { icon: BookmarkCheck, label: t("dash.savedSchemes"), path: "/dashboard" },
    { icon: FileBox, label: t("sidebar.documents"), path: "/dashboard" },
  ];

  return (
    <div className="min-h-screen pt-20 flex">
      <Sidebar
        title={t("chat.title")}
        subtitle="AI-Powered Assistance"
        items={sidebarItems}
        bottomActions={
          <Link to="/dashboard" className="block w-full gradient-primary text-primary-foreground font-headline font-bold py-3 rounded-lg text-sm text-center">
            {t("dash.startNewApp")}
          </Link>
        }
      />

      <main className="flex-1 px-6 md:px-10 py-8">
        <div className="max-w-5xl">
          <div className="flex items-start justify-between mb-8">
            <div>
              <h1 className="font-headline font-extrabold text-4xl tracking-tight mb-2">{t("schemes.title")}</h1>
              <p className="text-on-surface-variant">
                {filteredSchemes.length} {t("schemes.schemesCount")} — {t("schemes.subtitle")}
              </p>
            </div>
            <div className="hidden md:flex bg-surface-container rounded-lg ghost-border p-1">
              <button onClick={() => setViewMode("grid")} className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${viewMode === "grid" ? "bg-primary text-primary-foreground" : "text-on-surface-variant"}`}>{t("schemes.gridView")}</button>
              <button onClick={() => setViewMode("list")} className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${viewMode === "list" ? "bg-primary text-primary-foreground" : "text-on-surface-variant"}`}>{t("schemes.listView")}</button>
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-3 mb-4">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant" />
              <input type="text" placeholder={t("schemes.search")} value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
                className="w-full bg-surface-highest pl-10 pr-4 py-3 rounded-xl text-sm text-foreground placeholder:text-on-surface-variant focus:outline-none focus:ring-2 focus:ring-primary/50" />
            </div>
            <select value={selectedCategory} onChange={(e) => { setSelectedCategory(e.target.value); setPage(1); }} className="bg-surface-highest text-foreground px-4 py-3 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 appearance-none cursor-pointer">
              <option>{t("common.allCategories")}</option>
              {categories.map((c) => <option key={c}>{c}</option>)}
            </select>
            <select value={selectedState} onChange={(e) => { setSelectedState(e.target.value); setPage(1); }} className="bg-surface-highest text-foreground px-4 py-3 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 appearance-none cursor-pointer">
              <option>{t("common.allStates")}</option>
              {states.map((s) => <option key={s}>{s}</option>)}
            </select>
          </div>

          <div className="flex flex-wrap items-center gap-2 mb-8">
            <span className="text-xs text-on-surface-variant uppercase tracking-wider mr-2">{t("schemes.benefitType")}</span>
            {benefitTypes.map((type) => (
              <button key={type} onClick={() => toggleBenefitType(type)} className={`px-4 py-1.5 rounded-full text-xs font-medium ghost-border transition-all ${activeBenefitTypes.includes(type) ? "bg-primary/20 text-primary border-primary/30" : "text-on-surface-variant hover:text-foreground"}`}>
                {type}
              </button>
            ))}
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : (
            <>
              <div className={`grid ${viewMode === "grid" ? "md:grid-cols-2 lg:grid-cols-3" : "grid-cols-1"} gap-6 mb-8`}>
                {paginatedSchemes.map((scheme, i) => (
                  <motion.div key={scheme.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
                    className="bg-surface-container rounded-2xl p-6 ghost-border hover:bg-surface-high transition-colors group">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex gap-2 flex-wrap">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-accent/10 text-accent">{scheme.category}</span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-primary/10 text-primary">{scheme.state}</span>
                      </div>
                      <button onClick={() => handleSaveToggle(scheme.id)} className={`p-1 rounded transition-colors ${savedSchemeIds.has(scheme.id) ? "text-primary" : "text-on-surface-variant hover:text-foreground"}`}>
                        <Bookmark className="w-4 h-4" fill={savedSchemeIds.has(scheme.id) ? "currentColor" : "none"} />
                      </button>
                    </div>
                    <h3 className="font-headline font-bold text-lg mb-2 leading-snug">{scheme.title}</h3>
                    <p className="text-sm text-on-surface-variant mb-4 line-clamp-2">{scheme.description}</p>
                    {scheme.max_benefit && (
                      <p className="text-xs text-accent font-bold mb-3">{t("schemes.maxBenefit")} {scheme.max_benefit}</p>
                    )}
                    <div className="space-y-1.5 mb-5">
                      {(scheme.benefits || []).slice(0, 2).map((b) => (
                        <div key={b} className="flex items-center gap-2 text-sm">
                          <Check className="w-4 h-4 text-accent flex-shrink-0" />
                          <span className="text-foreground">{b}</span>
                        </div>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <Link
                        to={`/schemes/${scheme.id}`}
                        className="flex-1 py-2.5 px-4 rounded-xl text-sm font-medium transition-all gradient-primary text-primary-foreground inline-flex items-center justify-center gap-2"
                      >
                        {t("schemes.viewDetails")}
                        <ChevronRight className="w-4 h-4" />
                      </Link>
                      <button
                        type="button"
                        onClick={() => toggleSchemeSelection(scheme.id)}
                        className={`px-3 py-2.5 rounded-xl text-sm font-medium transition-all inline-flex items-center justify-center gap-2 ${
                          selectedSchemes.includes(scheme.id)
                            ? "bg-accent text-accent-foreground"
                            : "ghost-border text-on-surface-variant hover:text-foreground hover:bg-surface-bright/40"
                        }`}
                        title={selectedSchemes.includes(scheme.id) ? t("schemes.selectedCompare") : t("dash.compareSchemes")}
                      >
                        <GitCompareArrows className="w-4 h-4" />
                        <span className="hidden sm:inline">
                          {selectedSchemes.includes(scheme.id) ? t("schemes.selectedCompare") : t("dash.compareSchemes")}
                        </span>
                      </button>
                      <button onClick={() => setVerifyScheme(scheme)} className="p-2.5 rounded-xl ghost-border text-on-surface-variant hover:text-accent hover:border-accent/30 transition-all" title={t("schemes.verifyDocs")}>
                        <FileCheck className="w-4 h-4" />
                      </button>
                    </div>
                  </motion.div>
                ))}

                {paginatedSchemes.length > 0 && (
                  <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
                    className="bg-surface-container rounded-2xl p-6 ghost-border flex flex-col items-center justify-center text-center">
                    <div className="w-14 h-14 rounded-full bg-surface-bright flex items-center justify-center mb-4">
                      <Sparkles className="w-6 h-6 text-primary" />
                    </div>
                    <h3 className="font-headline font-bold text-lg mb-2">{t("schemes.cantFind")}</h3>
                    <p className="text-sm text-on-surface-variant mb-5">{t("schemes.letAI")}</p>
                    <Link to="/chat" className="gradient-primary text-primary-foreground font-medium px-6 py-2.5 rounded-xl text-sm hover:opacity-90 transition-opacity">{t("schemes.talkAI")}</Link>
                  </motion.div>
                )}
              </div>

              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 mb-12">
                  <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1} className="px-3 py-2 rounded-lg ghost-border text-on-surface-variant hover:text-foreground disabled:opacity-30">‹</button>
                  {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                    const p = i + 1;
                    return (
                      <button key={p} onClick={() => setPage(p)} className={`w-10 h-10 rounded-lg text-sm font-medium transition-all ${page === p ? "gradient-primary text-primary-foreground" : "ghost-border text-on-surface-variant hover:text-foreground"}`}>{p}</button>
                    );
                  })}
                  {totalPages > 5 && <span className="text-on-surface-variant">...</span>}
                  {totalPages > 5 && (
                    <button onClick={() => setPage(totalPages)} className={`w-10 h-10 rounded-lg text-sm font-medium transition-all ${page === totalPages ? "gradient-primary text-primary-foreground" : "ghost-border text-on-surface-variant hover:text-foreground"}`}>{totalPages}</button>
                  )}
                  <button onClick={() => setPage(Math.min(totalPages, page + 1))} disabled={page === totalPages} className="px-3 py-2 rounded-lg ghost-border text-on-surface-variant hover:text-foreground disabled:opacity-30">›</button>
                </div>
              )}
            </>
          )}

          {selectedSchemes.length > 0 && (
            <motion.div initial={{ y: 100, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
              className="fixed bottom-6 left-1/2 -translate-x-1/2 glass-panel rounded-2xl px-6 py-4 flex items-center gap-4 ghost-border surface-glow z-40">
              <div>
                <p className="text-xs text-accent uppercase tracking-wider font-medium">{t("schemes.comparisonActive")}</p>
                <p className="font-headline font-bold text-sm">{selectedSchemes.length} {t("schemes.schemesSelected")}</p>
              </div>
              {selectedSchemes.map((id) => {
                const s = filteredSchemes.find((s) => s.id === id);
                return (
                  <span key={id} className="bg-surface-highest px-3 py-1.5 rounded-full text-xs text-foreground flex items-center gap-1">
                    {s?.title.slice(0, 15)}...
                    <button onClick={() => toggleSchemeSelection(id)} className="text-on-surface-variant hover:text-foreground">×</button>
                  </span>
                );
              })}
              <button onClick={() => setSelectedSchemes([])} className="text-xs text-on-surface-variant hover:text-foreground">{t("common.clearAll")}</button>
              <button onClick={handleCompare} className="gradient-primary text-primary-foreground font-bold px-5 py-2 rounded-lg text-sm flex items-center gap-1">{t("schemes.compareNow")}</button>
            </motion.div>
          )}
        </div>
        <Footer />
      </main>

      <AnimatePresence>
        {verifyScheme && (
          <DocumentVerifier scheme={verifyScheme} onClose={() => setVerifyScheme(null)} />
        )}
      </AnimatePresence>
    </div>
  );
};

export default SchemeExplorer;
