import { motion } from "framer-motion";
import { MessageSquare, FileUp, Zap, ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";
import Footer from "@/components/Footer";
import { useLanguage } from "@/contexts/LanguageContext";

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.15, duration: 0.6, ease: "easeOut" },
  }),
};

const Landing = () => {
  const { t } = useLanguage();

  return (
    <div className="min-h-screen pt-20">
      {/* Hero */}
      <section className="relative px-6 md:px-8 max-w-7xl mx-auto pt-12 md:pt-20 pb-24">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={0}>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-surface-container mb-6 ghost-border">
              <span className="w-2 h-2 rounded-full bg-accent animate-pulse-glow" />
              <span className="text-xs font-medium uppercase tracking-wider text-on-surface-variant">
                {t("landing.badge")}
              </span>
            </div>
            <h1 className="font-headline font-extrabold text-4xl md:text-6xl leading-tight tracking-tight mb-6">
              {t("landing.title1")}{" "}
              <span className="gradient-primary-text">{t("landing.title2")}</span>
            </h1>
            <p className="text-on-surface-variant text-lg mb-8 max-w-lg leading-relaxed">
              {t("landing.subtitle")}
            </p>
            <div className="flex gap-4">
              <Link to="/schemes" className="gradient-primary text-primary-foreground font-headline font-bold px-6 py-3 rounded-lg hover:opacity-90 transition-opacity">
                {t("landing.explore")}
              </Link>
              <Link to="/chat" className="ghost-border bg-surface-variant/40 text-foreground font-headline font-bold px-6 py-3 rounded-lg hover:bg-surface-variant/60 transition-all flex items-center gap-2">
                <MessageSquare className="w-4 h-4" />
                {t("landing.tryAI")}
              </Link>
            </div>
          </motion.div>

          <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={1}>
            <div className="bg-surface-container rounded-2xl p-6 ghost-border surface-glow">
              <div className="flex items-center gap-2 mb-4">
                <span className="w-3 h-3 rounded-full bg-destructive" />
                <span className="w-3 h-3 rounded-full bg-yellow-500" />
                <span className="w-3 h-3 rounded-full bg-accent" />
                <span className="ml-auto text-xs text-on-surface-variant uppercase tracking-wider">{t("landing.systemInterface")}</span>
              </div>
              <div className="space-y-3">
                <div className="h-8 bg-surface-high rounded-lg w-3/4" />
                <div className="grid grid-cols-2 gap-3">
                  <div className="h-16 bg-surface-high rounded-lg" />
                  <div className="h-16 bg-surface-high rounded-lg flex items-center justify-center">
                    <FileUp className="w-5 h-5 text-on-surface-variant" />
                  </div>
                </div>
                <div className="bg-surface-high rounded-lg p-3 ghost-border">
                  <p className="text-xs text-on-surface-variant">{t("landing.subsidyFound")}</p>
                  <p className="text-lg font-headline font-bold text-accent">₹2,50,000</p>
                </div>
                <div className="flex items-center gap-2 bg-surface-bright/60 rounded-full px-4 py-2">
                  <div className="w-6 h-6 rounded-full gradient-primary flex items-center justify-center">
                    <Zap className="w-3 h-3 text-primary-foreground" />
                  </div>
                  <div>
                    <p className="text-[10px] text-accent uppercase tracking-wider font-medium">{t("landing.voiceProcessing")}</p>
                    <p className="text-xs text-foreground">{t("landing.voiceSearch")}</p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* How it Works */}
      <section className="px-6 md:px-8 max-w-7xl mx-auto pb-24">
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0}>
          <h2 className="font-headline font-extrabold text-3xl md:text-4xl tracking-tight mb-2">
            {t("landing.howItWorks").split(" ").slice(0, -1).join(" ")}{" "}
            <span className="text-primary">{t("landing.howItWorks").split(" ").slice(-1)}</span>
          </h2>
          <p className="text-on-surface-variant mb-12 max-w-md">{t("landing.howSubtitle")}</p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-6">
          {[
            { icon: MessageSquare, title: t("landing.step1Title"), desc: t("landing.step1Desc") },
            { icon: FileUp, title: t("landing.step2Title"), desc: t("landing.step2Desc") },
            { icon: Zap, title: t("landing.step3Title"), desc: t("landing.step3Desc") },
          ].map((item, i) => (
            <motion.div key={item.title} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={i + 1}
              className="bg-surface-container rounded-2xl p-8 ghost-border hover:bg-surface-high transition-colors group">
              <div className="w-12 h-12 rounded-xl bg-surface-highest flex items-center justify-center mb-6 group-hover:bg-primary/10 transition-colors">
                <item.icon className="w-5 h-5 text-primary" />
              </div>
              <h3 className="font-headline font-bold text-xl mb-3">{item.title}</h3>
              <p className="text-on-surface-variant text-sm leading-relaxed">{item.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Testimonials */}
      <section className="px-6 md:px-8 max-w-7xl mx-auto pb-24">
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0}>
          <h2 className="font-headline font-extrabold text-3xl md:text-4xl tracking-tight mb-2">
            {t("landing.voicesTitle").split(" ").slice(0, -1).join(" ")}{" "}
            <span className="text-primary">{t("landing.voicesTitle").split(" ").slice(-1)}</span>
          </h2>
          <p className="text-on-surface-variant mb-12 max-w-lg">{t("landing.voicesSubtitle")}</p>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-8">
          <div className="space-y-6">
            {[
              { quote: t("landing.testimonial1"), name: "Ramesh Kulkarni", role: t("landing.role1") },
              { quote: t("landing.testimonial2"), name: "Ananya Sharma", role: t("landing.role2") },
            ].map((item, i) => (
              <motion.div key={i} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={i + 1}
                className="bg-surface-container rounded-2xl p-6 ghost-border">
                <div className="text-primary text-3xl font-headline mb-4">"</div>
                <p className="text-foreground text-sm leading-relaxed italic mb-6">{item.quote}</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-surface-bright flex items-center justify-center">
                    <span className="text-sm font-bold text-primary">{item.name[0]}</span>
                  </div>
                  <div>
                    <p className="font-headline font-bold text-sm">{item.name}</p>
                    <p className="text-xs text-on-surface-variant uppercase tracking-wider">{item.role}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={2}
            className="bg-surface-container rounded-2xl p-8 ghost-border flex flex-col items-center justify-center text-center">
            <div className="w-20 h-20 rounded-full gradient-primary flex items-center justify-center mb-4 animate-float">
              <Zap className="w-8 h-8 text-primary-foreground" />
            </div>
            <p className="font-headline font-extrabold text-4xl text-accent mb-2">10,000+</p>
            <p className="text-on-surface-variant text-sm">{t("landing.successCount")}</p>
          </motion.div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 md:px-8 max-w-7xl mx-auto pb-24">
        <div className="bg-surface-container rounded-2xl p-8 md:p-12 ghost-border surface-glow text-center">
          <h2 className="font-headline font-extrabold text-3xl md:text-4xl tracking-tight mb-4">
            {t("landing.ctaTitle")}
          </h2>
          <p className="text-on-surface-variant mb-8 max-w-lg mx-auto">{t("landing.ctaSubtitle")}</p>
          <Link to="/schemes" className="inline-flex items-center gap-2 gradient-primary text-primary-foreground font-headline font-bold px-8 py-4 rounded-lg hover:opacity-90 transition-opacity text-lg">
            {t("landing.getStarted")} <ChevronRight className="w-5 h-5" />
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Landing;
