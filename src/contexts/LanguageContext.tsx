import { createContext, useContext, useState, ReactNode } from "react";

type Language = "en" | "hi";

interface Translations {
  [key: string]: { en: string; hi: string };
}

const translations: Translations = {
  // Navbar
  "nav.schemes": { en: "Schemes", hi: "योजनाएं" },
  "nav.dashboard": { en: "Dashboard", hi: "डैशबोर्ड" },
  "nav.chat": { en: "Chat", hi: "चैट" },
  "nav.signIn": { en: "Sign In", hi: "साइन इन" },
  "nav.signOut": { en: "Sign Out", hi: "साइन आउट" },

  // Landing
  "landing.badge": { en: "Sovereign Intelligence Active", hi: "सॉवरेन इंटेलिजेंस सक्रिय" },
  "landing.title1": { en: "Empowering India's Growth with", hi: "AI-संचालित योजनाओं से भारत की" },
  "landing.title2": { en: "AI-Driven Schemes", hi: "विकास को सशक्त बनाना" },
  "landing.subtitle": { en: "Discover and apply for 100+ government programs tailored for farmers and startups using our advanced RAG chatbot and voice interface.", hi: "हमारे उन्नत RAG चैटबॉट और वॉयस इंटरफेस का उपयोग करके किसानों और स्टार्टअप्स के लिए 100+ सरकारी कार्यक्रमों की खोज करें और आवेदन करें।" },
  "landing.explore": { en: "Start Exploring", hi: "खोजना शुरू करें" },
  "landing.tryAI": { en: "Try AI Assistant", hi: "AI सहायक आज़माएं" },
  "landing.howItWorks": { en: "How it Works", hi: "यह कैसे काम करता है" },
  "landing.howSubtitle": { en: "A seamless integration of AI and bureaucracy to serve you better.", hi: "AI और प्रशासन का एक निर्बाध एकीकरण आपकी बेहतर सेवा के लिए।" },
  "landing.step1Title": { en: "AI Discovery", hi: "AI खोज" },
  "landing.step1Desc": { en: "Interact with our RAG-powered chatbot via text or voice. Simply describe your needs, and our AI scans thousands of schemes to find your perfect match.", hi: "टेक्स्ट या वॉयस के माध्यम से हमारे RAG-संचालित चैटबॉट से बात करें। बस अपनी जरूरतें बताएं, और हमारा AI हजारों योजनाओं को स्कैन करेगा।" },
  "landing.step2Title": { en: "Auto Extraction", hi: "स्वत: निष्कर्षण" },
  "landing.step2Desc": { en: "Upload your ID and property documents. Our ML models extract relevant data instantly, eliminating manual form entry and reducing errors.", hi: "अपने आईडी और संपत्ति दस्तावेज़ अपलोड करें। हमारे ML मॉडल तुरंत प्रासंगिक डेटा निकालते हैं।" },
  "landing.step3Title": { en: "One-Click Apply", hi: "एक-क्लिक आवेदन" },
  "landing.step3Desc": { en: "Verify your pre-filled details and apply with a single tap. We handle the digital submission to state and central portals on your behalf.", hi: "अपने पूर्व-भरे विवरण सत्यापित करें और एक टैप से आवेदन करें।" },
  "landing.voicesTitle": { en: "Voices of Impact", hi: "प्रभाव की आवाज़ें" },
  "landing.voicesSubtitle": { en: "Real stories from pioneers who utilized Samarth Sahayak.", hi: "सार्थक सहायक का उपयोग करने वाले अग्रदूतों की वास्तविक कहानियां।" },
  "landing.ctaTitle": { en: "Ready to discover your benefits?", hi: "अपने लाभों की खोज के लिए तैयार?" },
  "landing.ctaSubtitle": { en: "Let our AI concierge match you with the perfect government schemes based on your profile and eligibility.", hi: "हमारे AI कॉन्सीयर्ज को आपकी प्रोफ़ाइल और पात्रता के आधार पर सही सरकारी योजनाओं से मिलान करने दें।" },
  "landing.getStarted": { en: "Get Started", hi: "शुरू करें" },
  "landing.systemInterface": { en: "System Interface", hi: "सिस्टम इंटरफेस" },
  "landing.subsidyFound": { en: "Potential Subsidy Found", hi: "संभावित सब्सिडी मिली" },
  "landing.voiceProcessing": { en: "Voice Processing", hi: "वॉयस प्रोसेसिंग" },
  "landing.voiceSearch": { en: '"Search startup grants..."', hi: '"स्टार्टअप अनुदान खोजें..."' },
  "landing.successCount": { en: "Successful Applications Processed This Month", hi: "इस महीने सफलतापूर्वक संसाधित आवेदन" },
  "landing.testimonial1": { en: "As a farmer in Vidarbha, navigating government websites was impossible. With the voice interface, I just spoke my needs in Marathi, and Samarth Sahayak found the PM-KUSUM scheme for my solar pumps. My application was done in minutes.", hi: "विदर्भ के एक किसान के रूप में, सरकारी वेबसाइटों को नेविगेट करना असंभव था। वॉयस इंटरफेस से, मैंने बस मराठी में अपनी जरूरतें बताईं, और सार्थक सहायक ने मेरे सोलर पंप के लिए PM-KUSUM योजना खोज ली। मेरा आवेदन मिनटों में हो गया।" },
  "landing.testimonial2": { en: "Securing the Startup India Seed Fund was a breeze. The AI Discovery tool accurately mapped our deep-tech requirements to the right funding category. A true digital architect for entrepreneurs.", hi: "स्टार्टअप इंडिया सीड फंड प्राप्त करना बहुत आसान था। AI डिस्कवरी टूल ने हमारी डीप-टेक आवश्यकताओं को सही फंडिंग श्रेणी से सटीक रूप से मैप किया। उद्यमियों के लिए एक सच्चा डिजिटल आर्किटेक्ट।" },
  "landing.role1": { en: "Progressive Farmer, Maharashtra", hi: "प्रगतिशील किसान, महाराष्ट्र" },
  "landing.role2": { en: "CEO, AgriStream Tech", hi: "CEO, AgriStream Tech" },

  // Scheme Explorer
  "schemes.title": { en: "Scheme Explorer", hi: "योजना खोजकर्ता" },
  "schemes.subtitle": { en: "Discover and manage sovereign schemes designed for your economic and social growth.", hi: "अपनी आर्थिक और सामाजिक वृद्धि के लिए डिज़ाइन की गई योजनाओं की खोज और प्रबंधन करें।" },
  "schemes.search": { en: "Search by scheme name or keywords...", hi: "योजना का नाम या कीवर्ड खोजें..." },
  "schemes.gridView": { en: "Grid View", hi: "ग्रिड दृश्य" },
  "schemes.listView": { en: "List View", hi: "सूची दृश्य" },
  "schemes.benefitType": { en: "Benefit Type:", hi: "लाभ प्रकार:" },
  "schemes.maxBenefit": { en: "Max Benefit:", hi: "अधिकतम लाभ:" },
  "schemes.viewDetails": { en: "View Scheme Details", hi: "योजना विवरण देखें" },
  "schemes.selectedCompare": { en: "Selected for Compare", hi: "तुलना के लिए चयनित" },
  "schemes.compareNow": { en: "Compare Now →", hi: "अभी तुलना करें →" },
  "schemes.comparisonActive": { en: "Comparison Active", hi: "तुलना सक्रिय" },
  "schemes.schemesSelected": { en: "Schemes Selected", hi: "योजनाएं चयनित" },
  "schemes.cantFind": { en: "Can't find the right one?", hi: "सही योजना नहीं मिल रही?" },
  "schemes.letAI": { en: "Let our AI Concierge find the perfect scheme based on your profile.", hi: "हमारे AI कॉन्सीयर्ज को आपकी प्रोफ़ाइल के आधार पर सही योजना खोजने दें।" },
  "schemes.talkAI": { en: "Talk to Samarth AI", hi: "सार्थक AI से बात करें" },
  "schemes.verifyDocs": { en: "Verify Documents", hi: "दस्तावेज़ सत्यापित करें" },
  "schemes.schemesCount": { en: "schemes", hi: "योजनाएं" },
  "schemes.signInToSave": { en: "Please sign in to save schemes", hi: "योजनाएं सहेजने के लिए साइन इन करें" },
  "schemes.removed": { en: "Scheme removed from saved", hi: "योजना सहेजी गई सूची से हटाई गई" },
  "schemes.saved": { en: "Scheme saved!", hi: "योजना सहेजी गई!" },
  "schemes.selectAtLeast2": { en: "Select at least 2 schemes to compare", hi: "तुलना के लिए कम से कम 2 योजनाएं चुनें" },

  // Dashboard
  "dash.title": { en: "Citizen Dashboard", hi: "नागरिक डैशबोर्ड" },
  "dash.welcome": { en: "Welcome back", hi: "वापसी पर स्वागत है" },
  "dash.subtitle": { en: "Your digital architect is ready to assist.", hi: "आपका डिजिटल आर्किटेक्ट सहायता के लिए तैयार है।" },
  "dash.aiNews": { en: "AI News Summary", hi: "AI समाचार सारांश" },
  "dash.docHub": { en: "Document Analysis Hub", hi: "दस्तावेज़ विश्लेषण केंद्र" },
  "dash.docHubDesc": { en: "Instant validation via Sovereign-ML engine", hi: "सॉवरेन-ML इंजन द्वारा तत्काल सत्यापन" },
  "dash.dragDocs": { en: "Drag and drop ID documents", hi: "आईडी दस्तावेज़ खींचें और छोड़ें" },
  "dash.docFormats": { en: "Aadhar, Pan, or Voter ID (PDF/JPG)", hi: "आधार, पैन, या वोटर आईडी (PDF/JPG)" },
  "dash.savedSchemes": { en: "Saved Schemes", hi: "सहेजी गई योजनाएं" },
  "dash.aiRec": { en: "AI Recommendations", hi: "AI अनुशंसाएं" },
  "dash.signInRequired": { en: "Sign in to access your Dashboard", hi: "अपने डैशबोर्ड तक पहुँचने के लिए साइन इन करें" },
  "dash.signInDesc": { en: "Track your schemes, applications, and AI recommendations.", hi: "अपनी योजनाओं, आवेदनों और AI अनुशंसाओं को ट्रैक करें।" },
  "dash.noSaved": { en: "No saved schemes yet. Browse and save schemes you're interested in.", hi: "अभी तक कोई सहेजी गई योजना नहीं। जिन योजनाओं में आपकी रुचि है उन्हें ब्राउज़ करें और सहेजें।" },
  "dash.exploreSchemes": { en: "Explore Schemes", hi: "योजनाएं खोजें" },
  "dash.browseAll": { en: "Browse All", hi: "सभी देखें" },
  "dash.uploadDoc": { en: "Upload Document", hi: "दस्तावेज़ अपलोड करें" },
  "dash.compareSchemes": { en: "Compare Schemes", hi: "योजनाओं की तुलना करें" },
  "dash.newApplication": { en: "New Application", hi: "नया आवेदन" },
  "dash.startNewApp": { en: "Start New Application", hi: "नया आवेदन शुरू करें" },
  "dash.talkAI": { en: "Talk to AI for Better Matches", hi: "बेहतर मिलान के लिए AI से बात करें" },
  "dash.microIrrigation": { en: "Micro-Irrigation Subsidy", hi: "सूक्ष्म-सिंचाई सब्सिडी" },
  "dash.microIrrigationDesc": { en: "Based on your profile — check eligibility now.", hi: "आपकी प्रोफ़ाइल के आधार पर — अभी पात्रता जांचें।" },
  "dash.livestock": { en: "Livestock Development Loan", hi: "पशुधन विकास ऋण" },
  "dash.livestockDesc": { en: "Low-interest credit for expanding operations.", hi: "परिचालन विस्तार के लिए कम ब्याज वाला ऋण।" },
  "dash.news1": { en: "New subsidy announced for Solar Pump installations in semi-arid regions. Applications open next Monday.", hi: "अर्ध-शुष्क क्षेत्रों में सोलर पंप स्थापना के लिए नई सब्सिडी की घोषणा। आवेदन अगले सोमवार से खुलेंगे।" },
  "dash.news2": { en: "Kisan Credit Card (KCC) limit increased by 15% for sustainable pulse cultivation practices.", hi: "टिकाऊ दलहन खेती के लिए किसान क्रेडिट कार्ड (KCC) सीमा 15% बढ़ाई गई।" },
  "dash.news3": { en: "PM-Kisan 17th installment processing finalized; verify your bank seeding status in the 'Documents' tab.", hi: "PM-किसान 17वीं किस्त प्रक्रिया पूरी; 'दस्तावेज़' टैब में अपनी बैंक सीडिंग स्थिति सत्यापित करें।" },

  // Sidebar
  "sidebar.overview": { en: "Overview", hi: "अवलोकन" },
  "sidebar.myApplications": { en: "My Applications", hi: "मेरे आवेदन" },
  "sidebar.saved": { en: "Saved", hi: "सहेजे गए" },
  "sidebar.documents": { en: "Documents", hi: "दस्तावेज़" },

  // Chat
  "chat.title": { en: "Sovereign Concierge", hi: "सॉवरेन कॉन्सीयर्ज" },
  "chat.voiceMode": { en: "Voice Mode", hi: "वॉयस मोड" },
  "chat.newChat": { en: "New Chat", hi: "नई चैट" },
  "chat.recentSessions": { en: "Recent Sessions", hi: "हाल के सत्र" },
  "chat.placeholder": { en: "Ask your sovereign concierge anything...", hi: "अपने सॉवरेन कॉन्सीयर्ज से कुछ भी पूछें..." },
  "chat.listening": { en: "Listening...", hi: "सुन रहा है..." },
  "chat.speaking": { en: "Speaking...", hi: "बोल रहा है..." },
  "chat.signInSave": { en: "Sign In to Save Chats", hi: "चैट सहेजने के लिए साइन इन करें" },
  "chat.askSchemes": { en: "What schemes are available for wheat farmers in Punjab?", hi: "पंजाब में गेहूं किसानों के लिए कौन सी योजनाएं उपलब्ध हैं?" },
  "chat.askStartup": { en: "Find startup funding schemes", hi: "स्टार्टअप फंडिंग योजनाएं खोजें" },
  "chat.askEligibility": { en: "Check my eligibility for PM-Kisan", hi: "PM-किसान के लिए मेरी पात्रता जांचें" },
  "chat.emptyDesc": { en: "Ask me about government schemes, eligibility, or let me help you find the perfect program. Enable voice mode to speak.", hi: "सरकारी योजनाओं, पात्रता, या मदद के बारे में पूछें। वॉयस मोड चालू करके बोलकर भी बात कर सकते हैं।" },
  "chat.voiceActive": { en: "Voice mode active - speak to interact", hi: "वॉयस मोड सक्रिय - बोलकर बात करें" },
  "chat.voiceOff": { en: "Hands-off AI interaction", hi: "वॉयस मोड बंद है" },
  "chat.speaker": { en: "Speaker", hi: "स्पीकर" },
  "chat.stopSpeaking": { en: "Stop Speaking", hi: "बोलना बंद करें" },
  "chat.intelSources": { en: "Intelligence Sources", hi: "इंटेलिजेंस स्रोत" },
  "chat.trustScore": { en: "AI Trust Score: 98%", hi: "AI विश्वास स्कोर: 98%" },
  "chat.ragNote": { en: "Responses generated using RAG technology, ensuring claims are grounded in official government gazettes.", hi: "प्रतिक्रियाएं RAG तकनीक का उपयोग करके उत्पन्न की जाती हैं।" },

  // Common
  "common.allCategories": { en: "All Categories", hi: "सभी श्रेणियां" },
  "common.allStates": { en: "All States", hi: "सभी राज्य" },
  "common.save": { en: "Save", hi: "सहेजें" },
  "common.clearAll": { en: "Clear All", hi: "सभी साफ़ करें" },
  "common.settings": { en: "Settings", hi: "सेटिंग्स" },
  "common.support": { en: "Support", hi: "सहायता" },
  "common.language": { en: "Language", hi: "भाषा" },
  "common.english": { en: "English", hi: "अंग्रेज़ी" },
  "common.hindi": { en: "Hindi", hi: "हिंदी" },
  "common.viewDetails": { en: "View Details", hi: "विवरण देखें" },

  // Document Verifier
  "doc.title": { en: "Document Verifier", hi: "दस्तावेज़ सत्यापनकर्ता" },
  "doc.upload": { en: "Upload Document", hi: "दस्तावेज़ अपलोड करें" },
  "doc.verify": { en: "Verify", hi: "सत्यापित करें" },
  "doc.verified": { en: "Verified", hi: "सत्यापित" },
  "doc.needsReview": { en: "Needs Review", hi: "समीक्षा आवश्यक" },
  "doc.rejected": { en: "Rejected", hi: "अस्वीकृत" },
  "doc.requiredDocs": { en: "Required Documents", hi: "आवश्यक दस्तावेज़" },
  "doc.dragDrop": { en: "Drag and drop or click to upload", hi: "खींचें और छोड़ें या अपलोड करने के लिए क्लिक करें" },
  "doc.confidence": { en: "Confidence", hi: "विश्वास स्कोर" },
  "doc.allVerified": { en: "All documents verified! Ready to apply.", hi: "सभी दस्तावेज़ सत्यापित! आवेदन के लिए तैयार।" },
  "doc.reupload": { en: "Re-upload", hi: "पुनः अपलोड करें" },
  "doc.verifyFailed": { en: "Verification failed. Please try again.", hi: "सत्यापन विफल। कृपया पुनः प्रयास करें।" },
  "doc.autoVerifyFail": { en: "Could not verify automatically.", hi: "स्वचालित रूप से सत्यापित नहीं किया जा सका।" },

  // Compare
  "compare.title": { en: "Scheme Comparison", hi: "योजना तुलना" },
  "compare.eligibility": { en: "Eligibility", hi: "पात्रता" },
  "compare.benefits": { en: "Benefits", hi: "लाभ" },
  "compare.maxBenefit": { en: "Max Benefit", hi: "अधिकतम लाभ" },
  "compare.category": { en: "Category", hi: "श्रेणी" },
  "compare.state": { en: "State", hi: "राज्य" },
  "compare.ministry": { en: "Ministry", hi: "मंत्रालय" },
  "compare.benefitType": { en: "Benefit Type", hi: "लाभ प्रकार" },
  "compare.back": { en: "← Back to Schemes", hi: "← योजनाओं पर वापस" },

  // Auth
  "auth.welcomeBack": { en: "Welcome Back", hi: "वापसी पर स्वागत है" },
  "auth.join": { en: "Join Samarth Sahayak", hi: "सार्थक सहायक से जुड़ें" },
  "auth.signInDesc": { en: "Sign in to access your sovereign dashboard", hi: "अपने सॉवरेन डैशबोर्ड तक पहुँचने के लिए साइन इन करें" },
  "auth.signUpDesc": { en: "Create your account to discover government schemes", hi: "सरकारी योजनाएं खोजने के लिए अपना खाता बनाएं" },
  "auth.fullName": { en: "Full Name", hi: "पूरा नाम" },
  "auth.email": { en: "Email address", hi: "ईमेल पता" },
  "auth.password": { en: "Password", hi: "पासवर्ड" },
  "auth.signIn": { en: "Sign In", hi: "साइन इन" },
  "auth.createAccount": { en: "Create Account", hi: "खाता बनाएं" },
  "auth.noAccount": { en: "Don't have an account?", hi: "खाता नहीं है?" },
  "auth.haveAccount": { en: "Already have an account?", hi: "पहले से खाता है?" },
  "auth.signUp": { en: "Sign Up", hi: "साइन अप" },

  // Footer
  "footer.copyright": { en: "© 2024 Samarth Sahayak. The Digital Architect Initiative.", hi: "© 2024 सार्थक सहायक। डिजिटल आर्किटेक्ट पहल।" },
  "footer.accessibility": { en: "Accessibility", hi: "पहुँच" },
  "footer.privacy": { en: "Privacy Policy", hi: "गोपनीयता नीति" },
  "footer.terms": { en: "Terms of Service", hi: "सेवा की शर्तें" },
  "footer.contact": { en: "Contact Us", hi: "संपर्क करें" },
};

interface LanguageContextType {
  language: Language;
  setLanguage: (l: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType>({
  language: "en",
  setLanguage: () => {},
  t: (key) => key,
});

export const useLanguage = () => useContext(LanguageContext);

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  const [language, setLanguage] = useState<Language>("en");

  const t = (key: string): string => {
    return translations[key]?.[language] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};
