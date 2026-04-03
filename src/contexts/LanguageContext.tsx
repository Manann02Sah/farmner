import { createContext, useContext, useState, ReactNode } from "react";

type Language = "en" | "hi";

interface Translations {
  [key: string]: { en: string; hi: string };
}

const translations: Translations = {
  "nav.schemes": { en: "Schemes", hi: "योजनाएँ" },
  "nav.dashboard": { en: "Dashboard", hi: "डैशबोर्ड" },
  "nav.chat": { en: "Chat", hi: "चैट" },
  "nav.signIn": { en: "Sign In", hi: "साइन इन" },
  "nav.signOut": { en: "Sign Out", hi: "साइन आउट" },

  "landing.badge": { en: "Farmer Support Platform", hi: "किसान सहायता मंच" },
  "landing.title1": { en: "Helping Farmers Access", hi: "किसानों को आसान पहुँच दिलाने वाला" },
  "landing.title2": { en: "Schemes and Services", hi: "योजना और सेवा साथी" },
  "landing.subtitle": { en: "Find relevant schemes, get help in English or Hindi, and manage documents in one place.", hi: "सही योजनाएँ खोजें, हिंदी या अंग्रेज़ी में मदद पाएँ, और दस्तावेज़ एक ही जगह संभालें।" },
  "landing.explore": { en: "Start Exploring", hi: "खोज शुरू करें" },
  "landing.tryAI": { en: "Try AI Assistant", hi: "एआई सहायक आज़माएँ" },
  "landing.howItWorks": { en: "How it Works", hi: "यह कैसे काम करता है" },
  "landing.howSubtitle": { en: "Simple steps to find support faster.", hi: "सहायता जल्दी पाने के लिए आसान चरण।" },
  "landing.step1Title": { en: "Ask", hi: "पूछें" },
  "landing.step1Desc": { en: "Ask by text or voice, and get scheme suggestions based on your needs.", hi: "टेक्स्ट या आवाज़ में पूछें और अपनी ज़रूरत के अनुसार योजना सुझाव पाएँ।" },
  "landing.step2Title": { en: "Upload", hi: "अपलोड करें" },
  "landing.step2Desc": { en: "Upload documents, review samples, and translate files when needed.", hi: "दस्तावेज़ अपलोड करें, नमूना देखें और ज़रूरत पड़ने पर अनुवाद करें।" },
  "landing.step3Title": { en: "Proceed", hi: "आगे बढ़ें" },
  "landing.step3Desc": { en: "Compare options, open scheme details, and move ahead with confidence.", hi: "विकल्पों की तुलना करें, योजना विवरण खोलें और भरोसे के साथ आगे बढ़ें।" },
  "landing.voicesTitle": { en: "Voices of Impact", hi: "अनुभव की आवाज़ें" },
  "landing.voicesSubtitle": { en: "Stories from people using Samarth Shayak.", hi: "समर्थ शायक का उपयोग करने वाले लोगों की कहानियाँ।" },
  "landing.ctaTitle": { en: "Ready to discover your benefits?", hi: "अपने लाभ जानने के लिए तैयार हैं?" },
  "landing.ctaSubtitle": { en: "Start with a quick search and see the schemes that fit your profile.", hi: "एक तेज़ खोज से शुरू करें और अपनी प्रोफ़ाइल के अनुसार योजनाएँ देखें।" },
  "landing.getStarted": { en: "Get Started", hi: "शुरू करें" },
  "landing.systemInterface": { en: "Live Platform", hi: "लाइव प्लेटफ़ॉर्म" },
  "landing.subsidyFound": { en: "Support Found", hi: "सहायता मिली" },
  "landing.voiceProcessing": { en: "Voice Support", hi: "वॉइस सहायता" },
  "landing.voiceSearch": { en: "\"Find support for my farm...\"", hi: "\"मेरे खेत के लिए सहायता खोजें...\"" },
  "landing.successCount": { en: "Farmer journeys supported this month", hi: "इस महीने समर्थित किसान यात्राएँ" },
  "landing.testimonial1": { en: "As a farmer in Vidarbha, government websites felt overwhelming. With voice support, I explained what I needed and quickly found the right solar pump scheme.", hi: "विदर्भ में किसान होने के नाते सरकारी वेबसाइटें मुश्किल लगती थीं। आवाज़ से अपनी ज़रूरत बताई और सही सोलर पंप योजना जल्दी मिल गई।" },
  "landing.testimonial2": { en: "The platform helped us shortlist the right support programs without wasting time on irrelevant options.", hi: "इस प्लेटफ़ॉर्म ने हमें बिना समय बर्बाद किए सही सहायता योजनाएँ चुनने में मदद की।" },
  "landing.role1": { en: "Farmer, Maharashtra", hi: "किसान, महाराष्ट्र" },
  "landing.role2": { en: "Agri Entrepreneur", hi: "कृषि उद्यमी" },

  "schemes.title": { en: "Scheme Explorer", hi: "योजना खोजकर्ता" },
  "schemes.subtitle": { en: "Explore schemes matched to your needs.", hi: "अपनी ज़रूरत के अनुसार योजनाएँ देखें।" },
  "schemes.search": { en: "Search by scheme name or keywords...", hi: "योजना का नाम या कीवर्ड खोजें..." },
  "schemes.gridView": { en: "Grid View", hi: "ग्रिड दृश्य" },
  "schemes.listView": { en: "List View", hi: "सूची दृश्य" },
  "schemes.benefitType": { en: "Benefit Type:", hi: "लाभ प्रकार:" },
  "schemes.maxBenefit": { en: "Max Benefit:", hi: "अधिकतम लाभ:" },
  "schemes.viewDetails": { en: "View Scheme Details", hi: "योजना विवरण देखें" },
  "schemes.selectedCompare": { en: "Selected for Compare", hi: "तुलना के लिए चुना गया" },
  "schemes.compareNow": { en: "Compare Now →", hi: "अभी तुलना करें →" },
  "schemes.comparisonActive": { en: "Comparison Active", hi: "तुलना सक्रिय" },
  "schemes.schemesSelected": { en: "Schemes Selected", hi: "चुनी गई योजनाएँ" },
  "schemes.cantFind": { en: "Can't find the right one?", hi: "सही योजना नहीं मिल रही?" },
  "schemes.letAI": { en: "Use chat to find schemes that fit your profile.", hi: "अपनी प्रोफ़ाइल के अनुसार योजना खोजने के लिए चैट का उपयोग करें।" },
  "schemes.talkAI": { en: "Chat with Samarth Shayak", hi: "समर्थ शायक से चैट करें" },
  "schemes.verifyDocs": { en: "Required Documents", hi: "आवश्यक दस्तावेज़" },
  "schemes.schemesCount": { en: "schemes", hi: "योजनाएँ" },
  "schemes.signInToSave": { en: "Please sign in to save schemes", hi: "योजनाएँ सेव करने के लिए साइन इन करें" },
  "schemes.removed": { en: "Scheme removed from saved", hi: "योजना सेव सूची से हटाई गई" },
  "schemes.saved": { en: "Scheme saved!", hi: "योजना सेव हो गई!" },
  "schemes.selectAtLeast2": { en: "Select at least 2 schemes to compare", hi: "तुलना के लिए कम से कम 2 योजनाएँ चुनें" },

  "dash.title": { en: "Farmer Dashboard", hi: "किसान डैशबोर्ड" },
  "dash.welcome": { en: "Welcome back", hi: "वापसी पर स्वागत है" },
  "dash.subtitle": { en: "Your support tools are ready.", hi: "आपके सहायता टूल तैयार हैं।" },
  "dash.aiNews": { en: "Updates", hi: "अपडेट" },
  "dash.docHub": { en: "Document Hub", hi: "दस्तावेज़ हब" },
  "dash.docHubDesc": { en: "Translate and review documents in one place", hi: "दस्तावेज़ अनुवाद और समीक्षा एक ही जगह" },
  "dash.dragDocs": { en: "Drag and drop ID documents", hi: "आईडी दस्तावेज़ खींचें और छोड़ें" },
  "dash.docFormats": { en: "Aadhaar, PAN, or Voter ID (PDF/JPG)", hi: "आधार, पैन या वोटर आईडी (PDF/JPG)" },
  "dash.savedSchemes": { en: "Saved Schemes", hi: "सेव की गई योजनाएँ" },
  "dash.aiRec": { en: "Recommendations", hi: "सुझाव" },
  "dash.signInRequired": { en: "Sign in to access your dashboard", hi: "अपने डैशबोर्ड तक पहुँचने के लिए साइन इन करें" },
  "dash.signInDesc": { en: "Track your schemes, applications, and recommendations.", hi: "अपनी योजनाओं, आवेदनों और सुझावों को ट्रैक करें।" },
  "dash.noSaved": { en: "No saved schemes yet. Browse and save schemes you're interested in.", hi: "अभी तक कोई योजना सेव नहीं है। अपनी पसंद की योजनाएँ देखें और सेव करें।" },
  "dash.exploreSchemes": { en: "Explore Schemes", hi: "योजनाएँ देखें" },
  "dash.browseAll": { en: "Browse All", hi: "सभी देखें" },
  "dash.uploadDoc": { en: "Open Document Hub", hi: "दस्तावेज़ हब खोलें" },
  "dash.compareSchemes": { en: "Compare Schemes", hi: "योजनाओं की तुलना करें" },
  "dash.newApplication": { en: "Explore More", hi: "और देखें" },
  "dash.startNewApp": { en: "Explore Schemes", hi: "योजनाएँ देखें" },
  "dash.talkAI": { en: "Open chat for better matches", hi: "बेहतर मिलान के लिए चैट खोलें" },
  "dash.microIrrigation": { en: "Micro-Irrigation Subsidy", hi: "सूक्ष्म सिंचाई सब्सिडी" },
  "dash.microIrrigationDesc": { en: "Based on your profile, check eligibility now.", hi: "अपनी प्रोफ़ाइल के अनुसार पात्रता अभी जाँचें।" },
  "dash.livestock": { en: "Livestock Development Loan", hi: "पशुधन विकास ऋण" },
  "dash.livestockDesc": { en: "Low-interest credit for expanding operations.", hi: "विस्तार के लिए कम ब्याज वाला ऋण।" },
  "dash.news1": { en: "New support windows are opening for solar pump installations in semi-arid regions.", hi: "अर्ध-शुष्क क्षेत्रों में सोलर पंप सहायता के लिए नई आवेदन विंडो खुल रही हैं।" },
  "dash.news2": { en: "Kisan Credit Card limits have been updated for sustainable cultivation practices.", hi: "किसान क्रेडिट कार्ड सीमाएँ टिकाऊ खेती प्रथाओं के लिए अपडेट हुई हैं।" },
  "dash.news3": { en: "Check your saved schemes and keep your bank details ready before applying.", hi: "आवेदन से पहले अपनी सेव योजनाएँ देखें और बैंक विवरण तैयार रखें।" },

  "sidebar.overview": { en: "Overview", hi: "अवलोकन" },
  "sidebar.myApplications": { en: "My Applications", hi: "मेरे आवेदन" },
  "sidebar.saved": { en: "Saved", hi: "सेव" },
  "sidebar.documents": { en: "Documents", hi: "दस्तावेज़" },

  "chat.title": { en: "Samarth Shayak AI", hi: "समर्थ शायक एआई" },
  "chat.voiceMode": { en: "Voice Mode", hi: "वॉइस मोड" },
  "chat.newChat": { en: "New Chat", hi: "नई चैट" },
  "chat.recentSessions": { en: "Recent Sessions", hi: "हाल की चैट" },
  "chat.placeholder": { en: "Ask anything about schemes, crops, or documents...", hi: "योजना, फसल या दस्तावेज़ के बारे में कुछ भी पूछें..." },
  "chat.listening": { en: "Listening...", hi: "सुन रहा है..." },
  "chat.speaking": { en: "Speaking...", hi: "बोल रहा है..." },
  "chat.signInSave": { en: "Sign In to Save Chats", hi: "चैट सेव करने के लिए साइन इन करें" },
  "chat.askSchemes": { en: "What schemes are available for wheat farmers in Punjab?", hi: "पंजाब में गेहूं किसानों के लिए कौन सी योजनाएँ उपलब्ध हैं?" },
  "chat.askStartup": { en: "Find startup funding schemes", hi: "स्टार्टअप फंडिंग योजनाएँ खोजें" },
  "chat.askEligibility": { en: "Check my eligibility for PM-Kisan", hi: "पीएम-किसान के लिए मेरी पात्रता जाँचें" },
  "chat.emptyDesc": { en: "Ask about schemes, eligibility, crops, or documents.", hi: "योजनाओं, पात्रता, फसल या दस्तावेज़ के बारे में पूछें।" },
  "chat.voiceActive": { en: "Voice mode active", hi: "वॉइस मोड सक्रिय" },
  "chat.voiceOff": { en: "Voice mode off", hi: "वॉइस मोड बंद" },
  "chat.speaker": { en: "Speaker", hi: "स्पीकर" },
  "chat.stopSpeaking": { en: "Stop Speaking", hi: "बोलना बंद करें" },
  "chat.intelSources": { en: "Sources", hi: "स्रोत" },
  "chat.trustScore": { en: "Support Mode", hi: "सहायता मोड" },
  "chat.ragNote": { en: "", hi: "" },

  "common.allCategories": { en: "All Categories", hi: "सभी श्रेणियाँ" },
  "common.allStates": { en: "All States", hi: "सभी राज्य" },
  "common.save": { en: "Save", hi: "सेव करें" },
  "common.clearAll": { en: "Clear All", hi: "साफ करें" },
  "common.settings": { en: "Settings", hi: "सेटिंग्स" },
  "common.support": { en: "Support", hi: "सहायता" },
  "common.language": { en: "Language", hi: "भाषा" },
  "common.english": { en: "English", hi: "अंग्रेज़ी" },
  "common.hindi": { en: "Hindi", hi: "हिंदी" },
  "common.viewDetails": { en: "View Details", hi: "विवरण देखें" },

  "doc.title": { en: "Document Checklist", hi: "दस्तावेज़ सूची" },
  "doc.upload": { en: "Upload Document", hi: "दस्तावेज़ अपलोड करें" },
  "doc.verify": { en: "Verify", hi: "सत्यापित करें" },
  "doc.verified": { en: "Verified", hi: "सत्यापित" },
  "doc.needsReview": { en: "Needs Review", hi: "समीक्षा आवश्यक" },
  "doc.rejected": { en: "Rejected", hi: "अस्वीकृत" },
  "doc.requiredDocs": { en: "Required Documents", hi: "आवश्यक दस्तावेज़" },
  "doc.dragDrop": { en: "Drag and drop or click to upload", hi: "खींचें और छोड़ें या अपलोड करने के लिए क्लिक करें" },
  "doc.confidence": { en: "Confidence", hi: "विश्वास" },
  "doc.allVerified": { en: "All documents verified! Ready to apply.", hi: "सभी दस्तावेज़ सत्यापित! आवेदन के लिए तैयार।" },
  "doc.reupload": { en: "Re-upload", hi: "फिर से अपलोड करें" },
  "doc.verifyFailed": { en: "Verification failed. Please try again.", hi: "सत्यापन विफल। कृपया फिर प्रयास करें।" },
  "doc.autoVerifyFail": { en: "Could not verify automatically.", hi: "स्वचालित रूप से सत्यापित नहीं हो सका।" },

  "compare.title": { en: "Scheme Comparison", hi: "योजना तुलना" },
  "compare.eligibility": { en: "Eligibility", hi: "पात्रता" },
  "compare.benefits": { en: "Benefits", hi: "लाभ" },
  "compare.maxBenefit": { en: "Max Benefit", hi: "अधिकतम लाभ" },
  "compare.category": { en: "Category", hi: "श्रेणी" },
  "compare.state": { en: "State", hi: "राज्य" },
  "compare.ministry": { en: "Ministry", hi: "मंत्रालय" },
  "compare.benefitType": { en: "Benefit Type", hi: "लाभ प्रकार" },
  "compare.back": { en: "← Back to Schemes", hi: "← योजनाओं पर वापस" },

  "auth.welcomeBack": { en: "Welcome Back", hi: "वापसी पर स्वागत है" },
  "auth.join": { en: "Join Samarth Shayak", hi: "समर्थ शायक से जुड़ें" },
  "auth.signInDesc": { en: "Sign in to access your dashboard", hi: "अपने डैशबोर्ड तक पहुँचने के लिए साइन इन करें" },
  "auth.signUpDesc": { en: "Create your account to discover government schemes", hi: "सरकारी योजनाएँ खोजने के लिए अपना खाता बनाएँ" },
  "auth.fullName": { en: "Full Name", hi: "पूरा नाम" },
  "auth.email": { en: "Email address", hi: "ईमेल पता" },
  "auth.password": { en: "Password", hi: "पासवर्ड" },
  "auth.signIn": { en: "Sign In", hi: "साइन इन" },
  "auth.createAccount": { en: "Create Account", hi: "खाता बनाएँ" },
  "auth.noAccount": { en: "Don't have an account?", hi: "खाता नहीं है?" },
  "auth.haveAccount": { en: "Already have an account?", hi: "पहले से खाता है?" },
  "auth.signUp": { en: "Sign Up", hi: "साइन अप" },

  "footer.copyright": { en: "© 2026 Samarth Shayak", hi: "© 2026 समर्थ शायक" },
  "footer.accessibility": { en: "Accessibility", hi: "पहुंच" },
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
