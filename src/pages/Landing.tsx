import { motion } from "framer-motion";
import { Camera, ChevronRight, FileUp, MessageSquare, ScanLine, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import Footer from "@/components/Footer";
import { useLanguage } from "@/contexts/LanguageContext";

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.12, duration: 0.6, ease: "easeOut" },
  }),
};

const Landing = () => {
  const { language } = useLanguage();

  const copy =
    language === "hi"
      ? {
          badge: "किसान सहायता मंच",
          title1: "योजनाओं, दस्तावेज़ों और",
          title2: "सही मार्गदर्शन तक आसान पहुंच",
          subtitle:
            "एक ही जगह पर योजना खोज, हिंदी वॉइस सहायता, दस्तावेज़ तैयारी और फोटो-आधारित फसल स्कैन का बेहतर अनुभव।",
          explore: "योजनाएं देखें",
          tryAI: "सहायक आज़माएं",
          workspace: "किसान कार्यक्षेत्र",
          cardTitle: "प्रोफाइल के हिसाब से तेज़ मदद",
          cardText: "प्रोफाइल, बातचीत और दस्तावेज़ तैयारी को जोड़कर सही अगले कदम दिखाए जाते हैं।",
          highlight1: "योजना खोज",
          highlight2: "दस्तावेज़ तैयारी",
          highlight3: "फसल स्कैन",
          howTitle: "अब यह कैसे काम करता है",
          howSubtitle: "नई अपडेट के साथ हर कदम ज्यादा साफ, तेज़ और उपयोगी बनाया गया है।",
          steps: [
            { icon: MessageSquare, title: "पूछें", desc: "टेक्स्ट या वॉइस में सवाल पूछें और अपनी ज़रूरत बताएं।" },
            { icon: Sparkles, title: "शॉर्टलिस्ट पाएं", desc: "बेहतर मिलान, ज़रूरी जानकारी और अगले कदम साथ में देखें।" },
            { icon: FileUp, title: "दस्तावेज़ तैयार करें", desc: "ज़रूरी दस्तावेज़ जांचें, अपलोड करें और तैयारियों को ट्रैक करें।" },
            { icon: Camera, title: "फसल फोटो स्कैन", desc: "कैमरा खोलें, फोटो लें और उसी क्लिक पर रिपोर्ट बनाएं।" },
          ],
          ctaTitle: "अपनी प्रोफाइल के अनुसार सही मदद ढूंढें",
          ctaSubtitle: "खोज से शुरू करें, फिर चैट और दस्तावेज़ टूल्स के साथ आगे बढ़ें।",
          getStarted: "शुरू करें",
        }
      : {
          badge: "Farmer Support Platform",
          title1: "Easier access to schemes, documents,",
          title2: "and practical support",
          subtitle:
            "A more polished home for scheme discovery, Hindi voice support, document readiness, and photo-based crop scanning.",
          explore: "Explore Schemes",
          tryAI: "Try Assistant",
          workspace: "Farmer workspace",
          cardTitle: "Fast guidance shaped around the profile",
          cardText: "Profile signals, conversation context, and document readiness come together to show the next best step.",
          highlight1: "Scheme discovery",
          highlight2: "Document readiness",
          highlight3: "Crop scan reports",
          howTitle: "How It Works Now",
          howSubtitle: "The latest flow is clearer, faster, and built around the way farmers actually use the platform.",
          steps: [
            { icon: MessageSquare, title: "Ask", desc: "Start with text or voice and describe what support you need." },
            { icon: Sparkles, title: "Get a shortlist", desc: "See stronger matches, missing details, and suggested next steps together." },
            { icon: FileUp, title: "Prepare documents", desc: "Review required files, upload them, and track readiness in one place." },
            { icon: Camera, title: "Capture crop images", desc: "Open the camera, click an image, and generate a report from that snapshot." },
          ],
          ctaTitle: "Find the right support for your profile",
          ctaSubtitle: "Start with search, then move forward with chat and document tools when you are ready.",
          getStarted: "Get Started",
        };

  return (
    <div className="min-h-screen pt-20">
      <section className="relative mx-auto max-w-7xl px-6 pb-24 pt-12 md:px-8 md:pt-20">
        <div className="absolute inset-x-6 top-10 -z-10 h-64 rounded-[2.5rem] bg-gradient-to-r from-primary/10 via-accent/10 to-transparent blur-3xl md:inset-x-12" />

        <div className="grid items-center gap-12 lg:grid-cols-[1.05fr_0.95fr]">
          <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={0}>
            <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-surface-container px-3 py-1.5 ghost-border">
              <span className="h-2 w-2 rounded-full bg-accent animate-pulse-glow" />
              <span className="text-xs font-medium uppercase tracking-wider text-on-surface-variant">{copy.badge}</span>
            </div>

            <h1 className="mb-6 font-headline text-4xl font-extrabold leading-tight tracking-tight md:text-6xl">
              {copy.title1} <span className="gradient-primary-text">{copy.title2}</span>
            </h1>

            <p className="mb-8 max-w-xl text-lg leading-relaxed text-on-surface-variant">{copy.subtitle}</p>

            <div className="mb-8 flex flex-wrap gap-4">
              <Link to="/schemes" className="gradient-primary rounded-lg px-6 py-3 font-headline font-bold text-primary-foreground transition-opacity hover:opacity-90">
                {copy.explore}
              </Link>
              <Link to="/chat" className="ghost-border flex items-center gap-2 rounded-lg bg-surface-variant/40 px-6 py-3 font-headline font-bold text-foreground transition-all hover:bg-surface-variant/60">
                <MessageSquare className="h-4 w-4" />
                {copy.tryAI}
              </Link>
            </div>

            <div className="flex flex-wrap gap-3">
              {[copy.highlight1, copy.highlight2, copy.highlight3].map((item) => (
                <div key={item} className="rounded-full bg-surface-container px-4 py-2 text-sm text-on-surface-variant ghost-border">
                  {item}
                </div>
              ))}
            </div>
          </motion.div>

          <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={1}>
            <div className="surface-glow overflow-hidden rounded-[2rem] bg-surface-container p-6 ghost-border">
              <div className="mb-5 flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-destructive" />
                <span className="h-3 w-3 rounded-full bg-yellow-500" />
                <span className="h-3 w-3 rounded-full bg-accent" />
                <span className="ml-auto text-xs uppercase tracking-wider text-on-surface-variant">{copy.workspace}</span>
              </div>

              <div className="grid gap-4">
                <div className="rounded-2xl bg-surface-high p-5">
                  <div className="mb-3 flex items-center gap-3">
                    <div className="gradient-primary flex h-11 w-11 items-center justify-center rounded-xl">
                      <ScanLine className="h-5 w-5 text-primary-foreground" />
                    </div>
                    <div>
                      <p className="font-headline text-lg font-bold">{copy.cardTitle}</p>
                      <p className="text-sm text-on-surface-variant">{copy.cardText}</p>
                    </div>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="rounded-2xl bg-background/40 p-4 ghost-border">
                    <p className="mb-2 text-[11px] uppercase tracking-[0.2em] text-accent">{copy.highlight1}</p>
                    <p className="text-sm text-on-surface-variant">
                      {language === "hi"
                        ? "बातचीत के आधार पर बेहतर मिलान और साफ शॉर्टलिस्ट।"
                        : "Better matching and cleaner shortlists from the conversation."}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-background/40 p-4 ghost-border">
                    <p className="mb-2 text-[11px] uppercase tracking-[0.2em] text-accent">{copy.highlight2}</p>
                    <p className="text-sm text-on-surface-variant">
                      {language === "hi"
                        ? "दस्तावेज़ तैयारी और आवश्यक फ़ाइलों की एक जगह पर समीक्षा।"
                        : "A single place to review document readiness and required files."}
                    </p>
                  </div>
                </div>

                <div className="rounded-2xl bg-gradient-to-r from-surface-high via-surface-highest to-surface-high p-5 ghost-border">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/15 text-primary">
                      <Camera className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold">{copy.highlight3}</p>
                      <p className="text-xs text-on-surface-variant">
                        {language === "hi"
                          ? "लाइव रीडिंग नहीं, सिर्फ क्लिक की गई फोटो पर रिपोर्ट।"
                          : "No continuous live reading, only report generation from a clicked image."}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 pb-24 md:px-8">
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0}>
          <h2 className="mb-2 font-headline text-3xl font-extrabold tracking-tight md:text-4xl">
            {copy.howTitle}
          </h2>
          <p className="mb-12 max-w-2xl text-on-surface-variant">{copy.howSubtitle}</p>
        </motion.div>

        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
          {copy.steps.map((item, index) => (
            <motion.div
              key={item.title}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={fadeUp}
              custom={index + 1}
              className="group rounded-2xl bg-surface-container p-7 ghost-border transition-colors hover:bg-surface-high"
            >
              <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-surface-highest transition-colors group-hover:bg-primary/10">
                <item.icon className="h-5 w-5 text-primary" />
              </div>
              <h3 className="mb-3 font-headline text-xl font-bold">{item.title}</h3>
              <p className="text-sm leading-relaxed text-on-surface-variant">{item.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 pb-24 md:px-8">
        <div className="surface-glow rounded-2xl bg-surface-container p-8 text-center ghost-border md:p-12">
          <h2 className="mb-4 font-headline text-3xl font-extrabold tracking-tight md:text-4xl">{copy.ctaTitle}</h2>
          <p className="mx-auto mb-8 max-w-lg text-on-surface-variant">{copy.ctaSubtitle}</p>
          <Link to="/schemes" className="gradient-primary inline-flex items-center gap-2 rounded-lg px-8 py-4 text-lg font-headline font-bold text-primary-foreground transition-opacity hover:opacity-90">
            {copy.getStarted} <ChevronRight className="h-5 w-5" />
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Landing;
