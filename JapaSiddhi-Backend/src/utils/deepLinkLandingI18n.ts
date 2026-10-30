/** Open-app landing copy for /ms and /book (same langs as the app). */

export const LANDING_LANGS = [
  'en',
  'hi',
  'te',
  'kn',
  'ta',
  'ml',
  'mr',
  'bn',
  'or',
] as const;

export type LandingLang = (typeof LANDING_LANGS)[number];

export const LANDING_LANG_LABELS: Record<LandingLang, string> = {
  en: 'English',
  hi: 'हिन्दी',
  te: 'తెలుగు',
  kn: 'ಕನ್ನಡ',
  ta: 'தமிழ்',
  ml: 'മലയാളം',
  mr: 'मराठी',
  bn: 'বাংলা',
  or: 'ଓଡ଼ିଆ',
};

type Ui = {
  openInApp: string;
  downloadPlay: string;
  notOpening: string;
  langLabel: string;
};

type MsCopy = {title: string; subtitle: string};
type BookCopy = {title: string; subtitle: string};

export type LandingPack = {
  ui: Ui;
  ms: {
    amount: (rupees: number) => MsCopy;
    custom: MsCopy;
    autopay: MsCopy;
    default: MsCopy;
  };
  book: {
    nithyaHomam: BookCopy;
    banaLingam: BookCopy;
    annaSantharpana: BookCopy;
    japaAnnadanam: BookCopy;
    monthlySupport: BookCopy;
    ramakoti: BookCopy;
    homaBhasma: BookCopy;
    birava: BookCopy;
    seva: BookCopy;
    festivals: BookCopy;
  };
};

const PACKS: Record<LandingLang, LandingPack> = {
  en: {
    ui: {
      openInApp: 'Open in Japa Siddhi App',
      downloadPlay: 'Please download the app (Play Store)',
      notOpening:
        'App not opening? Please download Japa Siddhi, then open this link again.',
      langLabel: 'Language',
    },
    ms: {
      amount: n => ({
        title: `Monthly Support — ₹${n}`,
        subtitle: `Open Japa Siddhi to contribute ₹${n} / month via Razorpay.`,
      }),
      custom: {
        title: 'Monthly Support — Custom amount',
        subtitle: 'Open Japa Siddhi to enter your own Monthly Support amount.',
      },
      autopay: {
        title: 'Monthly Support — Autopay',
        subtitle: 'Open Japa Siddhi to set up Monthly Support Autopay.',
      },
      default: {
        title: 'Monthly Support',
        subtitle: 'Open Japa Siddhi to contribute Monthly Support.',
      },
    },
    book: {
      nithyaHomam: {
        title: 'Nithya Homam',
        subtitle: 'Open Japa Siddhi to book Nithya Homam.',
      },
      banaLingam: {
        title: 'Baanalingam',
        subtitle: 'Open Japa Siddhi to book Baanalingam seva.',
      },
      annaSantharpana: {
        title: 'Anna Santharpana',
        subtitle: 'Open Japa Siddhi for Anna Santharpana.',
      },
      japaAnnadanam: {
        title: 'Japa Annadanam',
        subtitle: 'Open Japa Siddhi for Japa Annadanam.',
      },
      monthlySupport: {
        title: 'Monthly Support',
        subtitle: 'Open Japa Siddhi to contribute Monthly Support.',
      },
      ramakoti: {
        title: 'Ramakoti Books',
        subtitle: 'Open Japa Siddhi for Ramakoti.',
      },
      homaBhasma: {
        title: 'Homa Bhasma',
        subtitle: 'Open Japa Siddhi for Homa Bhasma.',
      },
      birava: {
        title: 'Bhairava Pendant',
        subtitle: 'Open Japa Siddhi for Bhairava Pendant.',
      },
      seva: {
        title: 'Book Seva',
        subtitle: 'Open Japa Siddhi to book seva.',
      },
      festivals: {
        title: 'Festivals',
        subtitle: 'Open Japa Siddhi for festival offerings.',
      },
    },
  },
  hi: {
    ui: {
      openInApp: 'जपा सिद्धि ऐप में खोलें',
      downloadPlay: 'कृपया ऐप डाउनलोड करें (Play Store)',
      notOpening:
        'ऐप नहीं खुल रहा? कृपया जपा सिद्धि डाउनलोड करें, फिर यह लिंक फिर से खोलें।',
      langLabel: 'भाषा',
    },
    ms: {
      amount: n => ({
        title: `मासिक सहायता — ₹${n}`,
        subtitle: `Razorpay से ₹${n} / माह देने के लिए जपा सिद्धि खोलें।`,
      }),
      custom: {
        title: 'मासिक सहायता — अपनी राशि',
        subtitle: 'अपनी मासिक सहायता राशि दर्ज करने के लिए जपा सिद्धि खोलें।',
      },
      autopay: {
        title: 'मासिक सहायता — ऑटोपे',
        subtitle: 'मासिक सहायता ऑटोपे सेट करने के लिए जपा सिद्धि खोलें।',
      },
      default: {
        title: 'मासिक सहायता',
        subtitle: 'मासिक सहायता देने के लिए जपा सिद्धि खोलें।',
      },
    },
    book: {
      nithyaHomam: {
        title: 'नित्य होमम',
        subtitle: 'नित्य होमम बुक करने के लिए जपा सिद्धि खोलें।',
      },
      banaLingam: {
        title: 'बाणलिंगम',
        subtitle: 'बाणलिंगम सेवा के लिए जपा सिद्धि खोलें।',
      },
      annaSantharpana: {
        title: 'अन्न संतर्पण',
        subtitle: 'अन्न संतर्पण के लिए जपा सिद्धि खोलें।',
      },
      japaAnnadanam: {
        title: 'जप अन्नदानम',
        subtitle: 'जप अन्नदानम के लिए जपा सिद्धि खोलें।',
      },
      monthlySupport: {
        title: 'मासिक सहायता',
        subtitle: 'मासिक सहायता देने के लिए जपा सिद्धि खोलें।',
      },
      ramakoti: {
        title: 'रामकोटी पुस्तकें',
        subtitle: 'रामकोटी के लिए जपा सिद्धि खोलें।',
      },
      homaBhasma: {
        title: 'होम भस्म',
        subtitle: 'होम भस्म के लिए जपा सिद्धि खोलें।',
      },
      birava: {
        title: 'भैरव पेंडेंट',
        subtitle: 'भैरव पेंडेंट के लिए जपा सिद्धि खोलें।',
      },
      seva: {
        title: 'सेवा बुक करें',
        subtitle: 'सेवा बुक करने के लिए जपा सिद्धि खोलें।',
      },
      festivals: {
        title: 'त्योहार',
        subtitle: 'त्योहार अर्पण के लिए जपा सिद्धि खोलें।',
      },
    },
  },
  te: {
    ui: {
      openInApp: 'జప సిద్ధి యాప్‌లో తెరవండి',
      downloadPlay: 'దయచేసి యాప్ డౌన్‌లోడ్ చేయండి (Play Store)',
      notOpening:
        'యాప్ తెరవడం లేదా? దయచేసి జప సిద్ధి డౌన్‌లోడ్ చేసి, ఈ లింక్‌ను మళ్లీ తెరవండి.',
      langLabel: 'భాష',
    },
    ms: {
      amount: n => ({
        title: `నెలవారీ సహాయం — ₹${n}`,
        subtitle: `Razorpay ద్వారా నెలకు ₹${n} సహాయం చేయడానికి జప సిద్ధి తెరవండి.`,
      }),
      custom: {
        title: 'నెలవారీ సహాయం — మీ మొత్తం',
        subtitle:
          'మీ స్వంత నెలవారీ సహాయ మొత్తం నమోదు చేయడానికి జప సిద్ధి తెరవండి.',
      },
      autopay: {
        title: 'నెలవారీ సహాయం — ఆటోపే',
        subtitle: 'నెలవారీ సహాయం ఆటోపే సెట్ చేయడానికి జప సిద్ధి తెరవండి.',
      },
      default: {
        title: 'నెలవారీ సహాయం',
        subtitle: 'నెలవారీ సహాయం చేయడానికి జప సిద్ధి తెరవండి.',
      },
    },
    book: {
      nithyaHomam: {
        title: 'నిత్య హోమం',
        subtitle: 'నిత్య హోమం బుక్ చేయడానికి జప సిద్ధి తెరవండి.',
      },
      banaLingam: {
        title: 'బాణలింగం',
        subtitle: 'బాణలింగం సేవ కోసం జప సిద్ధి తెరవండి.',
      },
      annaSantharpana: {
        title: 'అన్న సంతర్పణ',
        subtitle: 'అన్న సంతర్పణ కోసం జప సిద్ధి తెరవండి.',
      },
      japaAnnadanam: {
        title: 'జప అన్నదానం',
        subtitle: 'జప అన్నదానం కోసం జప సిద్ధి తెరవండి.',
      },
      monthlySupport: {
        title: 'నెలవారీ సహాయం',
        subtitle: 'నెలవారీ సహాయం చేయడానికి జప సిద్ధి తెరవండి.',
      },
      ramakoti: {
        title: 'రామకోటి పుస్తకాలు',
        subtitle: 'రామకోటి కోసం జప సిద్ధి తెరవండి.',
      },
      homaBhasma: {
        title: 'హోమ భస్మ',
        subtitle: 'హోమ భస్మ కోసం జప సిద్ధి తెరవండి.',
      },
      birava: {
        title: 'భైరవ పెండెంట్',
        subtitle: 'భైరవ పెండెంట్ కోసం జప సిద్ధి తెరవండి.',
      },
      seva: {
        title: 'సేవ బుక్ చేయండి',
        subtitle: 'సేవ బుక్ చేయడానికి జప సిద్ధి తెరవండి.',
      },
      festivals: {
        title: 'పండుగలు',
        subtitle: 'పండుగ అర్పణల కోసం జప సిద్ధి తెరవండి.',
      },
    },
  },
  kn: {
    ui: {
      openInApp: 'ಜಪ ಸಿದ್ಧಿ ಅಪ್ಲಿಕೇಶನ್‌ನಲ್ಲಿ ತೆರೆಯಿರಿ',
      downloadPlay: 'ದಯವಿಟ್ಟು ಅಪ್ಲಿಕೇಶನ್ ಡೌನ್‌ಲೋಡ್ ಮಾಡಿ (Play Store)',
      notOpening:
        'ಅಪ್ಲಿಕೇಶನ್ ತೆರೆಯುತ್ತಿಲ್ಲವೇ? ದಯವಿಟ್ಟು ಜಪ ಸಿದ್ಧಿ ಡೌನ್‌ಲೋಡ್ ಮಾಡಿ, ನಂತರ ಈ ಲಿಂಕ್ ಮತ್ತೆ ತೆರೆಯಿರಿ.',
      langLabel: 'ಭಾಷೆ',
    },
    ms: {
      amount: n => ({
        title: `ಮಾಸಿಕ ಸಹಾಯ — ₹${n}`,
        subtitle: `Razorpay ಮೂಲಕ ತಿಂಗಳಿಗೆ ₹${n} ನೀಡಲು ಜಪ ಸಿದ್ಧಿ ತೆರೆಯಿರಿ.`,
      }),
      custom: {
        title: 'ಮಾಸಿಕ ಸಹಾಯ — ನಿಮ್ಮ ಮೊತ್ತ',
        subtitle: 'ನಿಮ್ಮ ಮಾಸಿಕ ಸಹಾಯ ಮೊತ್ತ ನಮೂದಿಸಲು ಜಪ ಸಿದ್ಧಿ ತೆರೆಯಿರಿ.',
      },
      autopay: {
        title: 'ಮಾಸಿಕ ಸಹಾಯ — ಆಟೋಪೇ',
        subtitle: 'ಮಾಸಿಕ ಸಹಾಯ ಆಟೋಪೇ ಹೊಂದಿಸಲು ಜಪ ಸಿದ್ಧಿ ತೆರೆಯಿರಿ.',
      },
      default: {
        title: 'ಮಾಸಿಕ ಸಹಾಯ',
        subtitle: 'ಮಾಸಿಕ ಸಹಾಯ ನೀಡಲು ಜಪ ಸಿದ್ಧಿ ತೆರೆಯಿರಿ.',
      },
    },
    book: {
      nithyaHomam: {
        title: 'ನಿತ್ಯ ಹೋಮ',
        subtitle: 'ನಿತ್ಯ ಹೋಮ ಬುಕ್ ಮಾಡಲು ಜಪ ಸಿದ್ಧಿ ತೆರೆಯಿರಿ.',
      },
      banaLingam: {
        title: 'ಬಾಣಲಿಂಗ',
        subtitle: 'ಬಾಣಲಿಂಗ ಸೇವೆಗಾಗಿ ಜಪ ಸಿದ್ಧಿ ತೆರೆಯಿರಿ.',
      },
      annaSantharpana: {
        title: 'ಅನ್ನ ಸಂತರ್ಪಣ',
        subtitle: 'ಅನ್ನ ಸಂತರ್ಪಣಕ್ಕಾಗಿ ಜಪ ಸಿದ್ಧಿ ತೆರೆಯಿರಿ.',
      },
      japaAnnadanam: {
        title: 'ಜಪ ಅನ್ನದಾನ',
        subtitle: 'ಜಪ ಅನ್ನದಾನಕ್ಕಾಗಿ ಜಪ ಸಿದ್ಧಿ ತೆರೆಯಿರಿ.',
      },
      monthlySupport: {
        title: 'ಮಾಸಿಕ ಸಹಾಯ',
        subtitle: 'ಮಾಸಿಕ ಸಹಾಯ ನೀಡಲು ಜಪ ಸಿದ್ಧಿ ತೆರೆಯಿರಿ.',
      },
      ramakoti: {
        title: 'ರಾಮಕೋಟಿ ಪುಸ್ತಕಗಳು',
        subtitle: 'ರಾಮಕೋಟಿಗಾಗಿ ಜಪ ಸಿದ್ಧಿ ತೆರೆಯಿರಿ.',
      },
      homaBhasma: {
        title: 'ಹೋಮ ಭಸ್ಮ',
        subtitle: 'ಹೋಮ ಭಸ್ಮಕ್ಕಾಗಿ ಜಪ ಸಿದ್ಧಿ ತೆರೆಯಿರಿ.',
      },
      birava: {
        title: 'ಭೈರವ ಪೆಂಡೆಂಟ್',
        subtitle: 'ಭೈರವ ಪೆಂಡೆಂಟ್‌ಗಾಗಿ ಜಪ ಸಿದ್ಧಿ ತೆರೆಯಿರಿ.',
      },
      seva: {
        title: 'ಸೇವೆ ಬುಕ್ ಮಾಡಿ',
        subtitle: 'ಸೇವೆ ಬುಕ್ ಮಾಡಲು ಜಪ ಸಿದ್ಧಿ ತೆರೆಯಿರಿ.',
      },
      festivals: {
        title: 'ಹಬ್ಬಗಳು',
        subtitle: 'ಹಬ್ಬದ ಅರ್ಪಣೆಗಳಿಗಾಗಿ ಜಪ ಸಿದ್ಧಿ ತೆರೆಯಿರಿ.',
      },
    },
  },
  ta: {
    ui: {
      openInApp: 'ஜப சித்தி செயலியில் திறக்கவும்',
      downloadPlay: 'தயவுசெய்து செயலியைப் பதிவிறக்கவும் (Play Store)',
      notOpening:
        'செயலி திறக்கவில்லையா? தயவுசெய்து ஜப சித்தியைப் பதிவிறக்கி, இந்த இணைப்பை மீண்டும் திறக்கவும்.',
      langLabel: 'மொழி',
    },
    ms: {
      amount: n => ({
        title: `மாதாந்திர உதவி — ₹${n}`,
        subtitle: `Razorpay மூலம் மாதம் ₹${n} அளிக்க ஜப சித்தியைத் திறக்கவும்.`,
      }),
      custom: {
        title: 'மாதாந்திர உதவி — உங்கள் தொகை',
        subtitle:
          'உங்கள் மாதாந்திர உதவித் தொகையை உள்ளிட ஜப சித்தியைத் திறக்கவும்.',
      },
      autopay: {
        title: 'மாதாந்திர உதவி — ஆட்டோபே',
        subtitle: 'மாதாந்திர உதவி ஆட்டோபே அமைக்க ஜப சித்தியைத் திறக்கவும்.',
      },
      default: {
        title: 'மாதாந்திர உதவி',
        subtitle: 'மாதாந்திர உதவி அளிக்க ஜப சித்தியைத் திறக்கவும்.',
      },
    },
    book: {
      nithyaHomam: {
        title: 'நித்ய ஹோமம்',
        subtitle: 'நித்ய ஹோமம் பதிவு செய்ய ஜப சித்தியைத் திறக்கவும்.',
      },
      banaLingam: {
        title: 'பாணலிங்கம்',
        subtitle: 'பாணலிங்க சேவைக்கு ஜப சித்தியைத் திறக்கவும்.',
      },
      annaSantharpana: {
        title: 'அன்ன சந்தர்ப்பண',
        subtitle: 'அன்ன சந்தர்ப்பணத்திற்கு ஜப சித்தியைத் திறக்கவும்.',
      },
      japaAnnadanam: {
        title: 'ஜப அன்னதானம்',
        subtitle: 'ஜப அன்னதானத்திற்கு ஜப சித்தியைத் திறக்கவும்.',
      },
      monthlySupport: {
        title: 'மாதாந்திர உதவி',
        subtitle: 'மாதாந்திர உதவி அளிக்க ஜப சித்தியைத் திறக்கவும்.',
      },
      ramakoti: {
        title: 'ராமகோடி புத்தகங்கள்',
        subtitle: 'ராமகோடிக்காக ஜப சித்தியைத் திறக்கவும்.',
      },
      homaBhasma: {
        title: 'ஹோம பஸ்மம்',
        subtitle: 'ஹோம பஸ்மத்திற்கு ஜப சித்தியைத் திறக்கவும்.',
      },
      birava: {
        title: 'பைரவ பதக்கம்',
        subtitle: 'பைரவ பதக்கத்திற்கு ஜப சித்தியைத் திறக்கவும்.',
      },
      seva: {
        title: 'சேவை பதிவு',
        subtitle: 'சேவை பதிவு செய்ய ஜப சித்தியைத் திறக்கவும்.',
      },
      festivals: {
        title: 'திருவிழாக்கள்',
        subtitle: 'திருவிழா அர்ப்பணங்களுக்கு ஜப சித்தியைத் திறக்கவும்.',
      },
    },
  },
  ml: {
    ui: {
      openInApp: 'ജപ സിദ്ധി ആപ്പിൽ തുറക്കുക',
      downloadPlay: 'ദയവായി ആപ്പ് ഡൗൺലോഡ് ചെയ്യുക (Play Store)',
      notOpening:
        'ആപ്പ് തുറക്കുന്നില്ലേ? ദയവായി ജപ സിദ്ധി ഡൗൺലോഡ് ചെയ്ത് ഈ ലിങ്ക് വീണ്ടും തുറക്കുക.',
      langLabel: 'ഭാഷ',
    },
    ms: {
      amount: n => ({
        title: `മാസ സഹായം — ₹${n}`,
        subtitle: `Razorpay വഴി മാസം ₹${n} നൽകാൻ ജപ സിദ്ധി തുറക്കുക.`,
      }),
      custom: {
        title: 'മാസ സഹായം — നിങ്ങളുടെ തുക',
        subtitle: 'നിങ്ങളുടെ മാസ സഹായ തുക നൽകാൻ ജപ സിദ്ധി തുറക്കുക.',
      },
      autopay: {
        title: 'മാസ സഹായം — ഓട്ടോപേ',
        subtitle: 'മാസ സഹായ ഓട്ടോപേ സജ്ജമാക്കാൻ ജപ സിദ്ധി തുറക്കുക.',
      },
      default: {
        title: 'മാസ സഹായം',
        subtitle: 'മാസ സഹായം നൽകാൻ ജപ സിദ്ധി തുറക്കുക.',
      },
    },
    book: {
      nithyaHomam: {
        title: 'നിത്യ ഹോമം',
        subtitle: 'നിത്യ ഹോമം ബുക്ക് ചെയ്യാൻ ജപ സിദ്ധി തുറക്കുക.',
      },
      banaLingam: {
        title: 'ബാണലിംഗം',
        subtitle: 'ബാണലിംഗ സേവയ്ക്ക് ജപ സിദ്ധി തുറക്കുക.',
      },
      annaSantharpana: {
        title: 'അന്ന സന്തർപ്പണ',
        subtitle: 'അന്ന സന്തർപ്പണത്തിന് ജപ സിദ്ധി തുറക്കുക.',
      },
      japaAnnadanam: {
        title: 'ജപ അന്നദാനം',
        subtitle: 'ജപ അന്നദാനത്തിന് ജപ സിദ്ധി തുറക്കുക.',
      },
      monthlySupport: {
        title: 'മാസ സഹായം',
        subtitle: 'മാസ സഹായം നൽകാൻ ജപ സിദ്ധി തുറക്കുക.',
      },
      ramakoti: {
        title: 'രാമകോടി പുസ്തകങ്ങൾ',
        subtitle: 'രാമകോടിക്ക് ജപ സിദ്ധി തുറക്കുക.',
      },
      homaBhasma: {
        title: 'ഹോമ ഭസ്മം',
        subtitle: 'ഹോമ ഭസ്മത്തിന് ജപ സിദ്ധി തുറക്കുക.',
      },
      birava: {
        title: 'ഭൈരവ പെൻഡന്റ്',
        subtitle: 'ഭൈരവ പെൻഡന്റിന് ജപ സിദ്ധി തുറക്കുക.',
      },
      seva: {
        title: 'സേവ ബുക്ക് ചെയ്യുക',
        subtitle: 'സേവ ബുക്ക് ചെയ്യാൻ ജപ സിദ്ധി തുറക്കുക.',
      },
      festivals: {
        title: 'ഉത്സവങ്ങൾ',
        subtitle: 'ഉത്സവ അർപ്പണങ്ങൾക്ക് ജപ സിദ്ധി തുറക്കുക.',
      },
    },
  },
  mr: {
    ui: {
      openInApp: 'जपा सिद्धी अॅपमध्ये उघडा',
      downloadPlay: 'कृपया अॅप डाउनलोड करा (Play Store)',
      notOpening:
        'अॅप उघडत नाही? कृपया जपा सिद्धी डाउनलोड करा आणि हा लिंक पुन्हा उघडा.',
      langLabel: 'भाषा',
    },
    ms: {
      amount: n => ({
        title: `मासिक सहाय्य — ₹${n}`,
        subtitle: `Razorpay द्वारे दरमहा ₹${n} देण्यासाठी जपा सिद्धी उघडा.`,
      }),
      custom: {
        title: 'मासिक सहाय्य — तुमची रक्कम',
        subtitle: 'तुमची मासिक सहाय्य रक्कम टाकण्यासाठी जपा सिद्धी उघडा.',
      },
      autopay: {
        title: 'मासिक सहाय्य — ऑटोपे',
        subtitle: 'मासिक सहाय्य ऑटोपे सेट करण्यासाठी जपा सिद्धी उघडा.',
      },
      default: {
        title: 'मासिक सहाय्य',
        subtitle: 'मासिक सहाय्य देण्यासाठी जपा सिद्धी उघडा.',
      },
    },
    book: {
      nithyaHomam: {
        title: 'नित्य होम',
        subtitle: 'नित्य होम बुक करण्यासाठी जपा सिद्धी उघडा.',
      },
      banaLingam: {
        title: 'बाणलिंग',
        subtitle: 'बाणलिंग सेवेसाठी जपा सिद्धी उघडा.',
      },
      annaSantharpana: {
        title: 'अन्न संतर्पण',
        subtitle: 'अन्न संतर्पणासाठी जपा सिद्धी उघडा.',
      },
      japaAnnadanam: {
        title: 'जप अन्नदान',
        subtitle: 'जप अन्नदानासाठी जपा सिद्धी उघडा.',
      },
      monthlySupport: {
        title: 'मासिक सहाय्य',
        subtitle: 'मासिक सहाय्य देण्यासाठी जपा सिद्धी उघडा.',
      },
      ramakoti: {
        title: 'रामकोटी पुस्तके',
        subtitle: 'रामकोटीसाठी जपा सिद्धी उघडा.',
      },
      homaBhasma: {
        title: 'होम भस्म',
        subtitle: 'होम भस्मासाठी जपा सिद्धी उघडा.',
      },
      birava: {
        title: 'भैरव पेंडंट',
        subtitle: 'भैरव पेंडंटसाठी जपा सिद्धी उघडा.',
      },
      seva: {
        title: 'सेवा बुक करा',
        subtitle: 'सेवा बुक करण्यासाठी जपा सिद्धी उघडा.',
      },
      festivals: {
        title: 'सण',
        subtitle: 'सण अर्पणासाठी जपा सिद्धी उघडा.',
      },
    },
  },
  bn: {
    ui: {
      openInApp: 'জপা সিদ্ধি অ্যাপে খুলুন',
      downloadPlay: 'অনুগ্রহ করে অ্যাপ ডাউনলোড করুন (Play Store)',
      notOpening:
        'অ্যাপ খুলছে না? অনুগ্রহ করে জপা সিদ্ধি ডাউনলোড করে এই লিংক আবার খুলুন।',
      langLabel: 'ভাষা',
    },
    ms: {
      amount: n => ({
        title: `মাসিক সহায়তা — ₹${n}`,
        subtitle: `Razorpay এর মাধ্যমে মাসে ₹${n} দিতে জপা সিদ্ধি খুলুন।`,
      }),
      custom: {
        title: 'মাসিক সহায়তা — আপনার পরিমাণ',
        subtitle: 'আপনার মাসিক সহায়তার পরিমাণ লিখতে জপা সিদ্ধি খুলুন।',
      },
      autopay: {
        title: 'মাসিক সহায়তা — অটোপে',
        subtitle: 'মাসিক সহায়তা অটোপে সেট করতে জপা সিদ্ধি খুলুন।',
      },
      default: {
        title: 'মাসিক সহায়তা',
        subtitle: 'মাসিক সহায়তা দিতে জপা সিদ্ধি খুলুন।',
      },
    },
    book: {
      nithyaHomam: {
        title: 'নিত্য হোমম',
        subtitle: 'নিত্য হোমম বুক করতে জপা সিদ্ধি খুলুন।',
      },
      banaLingam: {
        title: 'বাণলিঙ্গম',
        subtitle: 'বাণলিঙ্গম সেবার জন্য জপা সিদ্ধি খুলুন।',
      },
      annaSantharpana: {
        title: 'অন্ন সন্তর্পণ',
        subtitle: 'অন্ন সন্তর্পণের জন্য জপা সিদ্ধি খুলুন।',
      },
      japaAnnadanam: {
        title: 'জপ অন্নদান',
        subtitle: 'জপ অন্নদানের জন্য জপা সিদ্ধি খুলুন।',
      },
      monthlySupport: {
        title: 'মাসিক সহায়তা',
        subtitle: 'মাসিক সহায়তা দিতে জপা সিদ্ধি খুলুন।',
      },
      ramakoti: {
        title: 'রামকোটী বই',
        subtitle: 'রামকোটীর জন্য জপা সিদ্ধি খুলুন।',
      },
      homaBhasma: {
        title: 'হোম ভস্ম',
        subtitle: 'হোম ভস্মের জন্য জপা সিদ্ধি খুলুন।',
      },
      birava: {
        title: 'ভৈরব পেন্ডেন্ট',
        subtitle: 'ভৈরব পেন্ডেন্টের জন্য জপা সিদ্ধি খুলুন।',
      },
      seva: {
        title: 'সেবা বুক করুন',
        subtitle: 'সেবা বুক করতে জপা সিদ্ধি খুলুন।',
      },
      festivals: {
        title: 'উৎসব',
        subtitle: 'উৎসব অর্পণের জন্য জপা সিদ্ধি খুলুন।',
      },
    },
  },
  or: {
    ui: {
      openInApp: 'ଜପ ସିଦ୍ଧି ଆପରେ ଖୋଲନ୍ତୁ',
      downloadPlay: 'ଦୟାକରି ଆପ ଡାଉନଲୋଡ୍ କରନ୍ତୁ (Play Store)',
      notOpening:
        'ଆପ ଖୋଲୁନାହିଁ? ଦୟାକରି ଜପ ସିଦ୍ଧି ଡାଉନଲୋଡ୍ କରି ଏହି ଲିଙ୍କ୍ ପୁଣି ଖୋଲନ୍ତୁ।',
      langLabel: 'ଭାଷା',
    },
    ms: {
      amount: n => ({
        title: `ମାସିକ ସହାୟତା — ₹${n}`,
        subtitle: `Razorpay ମାଧ୍ୟମରେ ମାସକୁ ₹${n} ଦେବା ପାଇଁ ଜପ ସିଦ୍ଧି ଖୋଲନ୍ତୁ।`,
      }),
      custom: {
        title: 'ମାସିକ ସହାୟତା — ଆପଣଙ୍କ ରାଶି',
        subtitle:
          'ଆପଣଙ୍କ ମାସିକ ସହାୟତା ରାଶି ଲେଖିବା ପାଇଁ ଜପ ସିଦ୍ଧି ଖୋଲନ୍ତୁ।',
      },
      autopay: {
        title: 'ମାସିକ ସହାୟତା — ଅଟୋପେ',
        subtitle:
          'ମାସିକ ସହାୟତା ଅଟୋପେ ସେଟ୍ କରିବା ପାଇଁ ଜପ ସିଦ୍ଧି ଖୋଲନ୍ତୁ।',
      },
      default: {
        title: 'ମାସିକ ସହାୟତା',
        subtitle: 'ମାସିକ ସହାୟତା ଦେବା ପାଇଁ ଜପ ସିଦ୍ଧି ଖୋଲନ୍ତୁ।',
      },
    },
    book: {
      nithyaHomam: {
        title: 'ନିତ୍ୟ ହୋମମ୍',
        subtitle: 'ନିତ୍ୟ ହୋମମ୍ ବୁକ୍ କରିବା ପାଇଁ ଜପ ସିଦ୍ଧି ଖୋଲନ୍ତୁ।',
      },
      banaLingam: {
        title: 'ବାଣଲିଙ୍ଗମ୍',
        subtitle: 'ବାଣଲିଙ୍ଗମ୍ ସେବା ପାଇଁ ଜପ ସିଦ୍ଧି ଖୋଲନ୍ତୁ।',
      },
      annaSantharpana: {
        title: 'ଅନ୍ନ ସନ୍ତର୍ପଣ',
        subtitle: 'ଅନ୍ନ ସନ୍ତର୍ପଣ ପାଇଁ ଜପ ସିଦ୍ଧି ଖୋଲନ୍ତୁ।',
      },
      japaAnnadanam: {
        title: 'ଜପ ଅନ୍ନଦାନ',
        subtitle: 'ଜପ ଅନ୍ନଦାନ ପାଇଁ ଜପ ସିଦ୍ଧି ଖୋଲନ୍ତୁ।',
      },
      monthlySupport: {
        title: 'ମାସିକ ସହାୟତା',
        subtitle: 'ମାସିକ ସହାୟତା ଦେବା ପାଇଁ ଜପ ସିଦ୍ଧି ଖୋଲନ୍ତୁ।',
      },
      ramakoti: {
        title: 'ରାମକୋଟି ବହି',
        subtitle: 'ରାମକୋଟି ପାଇଁ ଜପ ସିଦ୍ଧି ଖୋଲନ୍ତୁ।',
      },
      homaBhasma: {
        title: 'ହୋମ ଭସ୍ମ',
        subtitle: 'ହୋମ ଭସ୍ମ ପାଇଁ ଜପ ସିଦ୍ଧି ଖୋଲନ୍ତୁ।',
      },
      birava: {
        title: 'ଭୈରବ ପେଣ୍ଡେଣ୍ଟ',
        subtitle: 'ଭୈରବ ପେଣ୍ଡେଣ୍ଟ ପାଇଁ ଜପ ସିଦ୍ଧି ଖୋଲନ୍ତୁ।',
      },
      seva: {
        title: 'ସେବା ବୁକ୍ କରନ୍ତୁ',
        subtitle: 'ସେବା ବୁକ୍ କରିବା ପାଇଁ ଜପ ସିଦ୍ଧି ଖୋଲନ୍ତୁ।',
      },
      festivals: {
        title: 'ପର୍ବ',
        subtitle: 'ପର୍ବ ଅର୍ପଣ ପାଇଁ ଜପ ସିଦ୍ଧି ଖୋଲନ୍ତୁ।',
      },
    },
  },
};


export const isLandingLang = (code: string): code is LandingLang =>
  (LANDING_LANGS as readonly string[]).includes(code);

export const resolveLandingLang = (raw?: string | null): LandingLang => {
  const code = String(raw || '')
    .trim()
    .toLowerCase()
    .slice(0, 2);
  return isLandingLang(code) ? code : 'en';
};

export const landingLangFromAccept = (header?: string | null): LandingLang => {
  const parts = String(header || '')
    .split(',')
    .map(part => part.trim().split(';')[0].trim().toLowerCase());
  for (const part of parts) {
    const short = part.slice(0, 2);
    if (isLandingLang(short)) {
      return short;
    }
  }
  return 'en';
};

export const getLandingPack = (lang?: string | null): LandingPack =>
  PACKS[resolveLandingLang(lang)] || PACKS.en;
