/**
 * Short "what's new" notes shown on the forced-update screen.
 *
 * Keyed by the release version (must equal LATEST_APP_VERSION on the server when
 * that APK is published). Only the important points are listed here; keep it short.
 * Languages not listed fall back to English.
 */
export type AppReleaseNotes = {
  fixedTitle: string;
  fixed: string[];
  newTitle: string;
  features: string[];
};

const NOTES: Record<string, Record<string, AppReleaseNotes>> = {
  '1.3.3': {
    en: {
      fixedTitle: 'What we fixed',
      fixed: [
        'Your Japas: "Change deadline" no longer closes the app.',
        'My Orders loads again.',
        'Payments made in the app show in Transaction History sooner.',
      ],
      newTitle: 'New in this update',
      features: [
        'Goals stay open for 2 days after the deadline, then show as expired. Your japas are saved.',
        'Goal Complete: pick a new end date when extending a goal.',
      ],
    },
    hi: {
      fixedTitle: 'इस अपडेट में क्या ठीक किया गया',
      fixed: [
        'आपके जप में "Change deadline" खोलने पर ऐप बंद नहीं होगा।',
        'मेरे ऑर्डर फिर से लोड होते हैं।',
        'ऐप से किए गए भुगतान अब लेन-देन इतिहास में जल्दी दिखते हैं।',
      ],
      newTitle: 'इस अपडेट में नया',
      features: [
        'अंतिम तिथि के 2 दिन बाद तक लक्ष्य खुला रहेगा, फिर वह समाप्त दिखेगा। आपके जप सुरक्षित रहेंगे।',
        'Goal Complete: लक्ष्य बढ़ाते समय नई अंतिम तिथि चुनें।',
      ],
    },
    te: {
      fixedTitle: 'ఈ అప్‌డేట్‌లో ఏమి సరిచేశాము',
      fixed: [
        'మీ జపాలలో "Change deadline" నొక్కితే యాప్ మూసుకోదు.',
        'నా ఆర్డర్లు మళ్లీ సరిగ్గా లోడ్ అవుతాయి.',
        'యాప్ ద్వారా చేసిన చెల్లింపులు లావాదేవీ చరిత్రలో త్వరగా కనిపిస్తాయి.',
      ],
      newTitle: 'ఈ అప్‌డేట్‌లో కొత్తవి',
      features: [
        'గడువు తేదీ తర్వాత 2 రోజుల వరకు లక్ష్యం తెరిచే ఉంటుంది, తర్వాత గడువు ముగిసినట్లు కనిపిస్తుంది. మీ జపాలు భద్రంగా ఉంటాయి.',
        'Goal Complete: లక్ష్యాన్ని పొడిగించేటప్పుడు కొత్త ముగింపు తేదీని ఎంచుకోవచ్చు.',
      ],
    },
    kn: {
      fixedTitle: 'ಈ ಅಪ್‌ಡೇಟ್‌ನಲ್ಲಿ ಸರಿಪಡಿಸಿದ್ದು',
      fixed: [
        'ನಿಮ್ಮ ಜಪ: "Change deadline" ತೆರೆದರೆ ಆ್ಯಪ್ ಮುಚ್ಚುವುದಿಲ್ಲ.',
        'ನನ್ನ ಆರ್ಡರ್‌ಗಳು ಮತ್ತೆ ಲೋಡ್ ಆಗುತ್ತವೆ.',
        'ಆ್ಯಪ್‌ನಲ್ಲಿ ಮಾಡಿದ ಪಾವತಿಗಳು ವಹಿವಾಟು ಇತಿಹಾಸದಲ್ಲಿ ಬೇಗ ಕಾಣಿಸುತ್ತವೆ.',
      ],
      newTitle: 'ಈ ಅಪ್‌ಡೇಟ್‌ನಲ್ಲಿ ಹೊಸದು',
      features: [
        'ಗಡುವು ಮುಗಿದ 2 ದಿನಗಳವರೆಗೆ ಗುರಿ ತೆರೆದಿರುತ್ತದೆ, ನಂತರ ಅವಧಿ ಮುಗಿದಂತೆ ತೋರಿಸುತ್ತದೆ. ನಿಮ್ಮ ಜಪ ಉಳಿಯುತ್ತದೆ.',
        'Goal Complete: ಗುರಿ ವಿಸ್ತರಿಸುವಾಗ ಹೊಸ ಅಂತಿಮ ದಿನಾಂಕ ಆಯ್ಕೆ ಮಾಡಿ.',
      ],
    },
    ta: {
      fixedTitle: 'இந்தப் புதுப்பிப்பில் சரிசெய்தவை',
      fixed: [
        'உங்கள் ஜபம்: "Change deadline" திறந்தால் ஆப் மூடாது.',
        'என் ஆர்டர்கள் மீண்டும் சரியாக ஏற்றப்படும்.',
        'ஆப் மூலம் செய்த கட்டணங்கள் பரிவர்த்தனை வரலாற்றில் விரைவில் தெரியும்.',
      ],
      newTitle: 'இந்தப் புதுப்பிப்பில் புதியவை',
      features: [
        'காலக்கெடுவுக்குப் பின் 2 நாட்கள் வரை இலக்கு திறந்திருக்கும்; பின்னர் காலாவதியானதாகக் காட்டும். உங்கள் ஜபங்கள் சேமிக்கப்படும்.',
        'Goal Complete: இலக்கை நீட்டிக்கும்போது புதிய முடிவு தேதியைத் தேர்ந்தெடுக்கலாம்.',
      ],
    },
    ml: {
      fixedTitle: 'ഈ അപ്‌ഡേറ്റിൽ പരിഹരിച്ചവ',
      fixed: [
        'നിങ്ങളുടെ ജപം: "Change deadline" തുറന്നാൽ ആപ്പ് അടയില്ല.',
        'എന്റെ ഓർഡറുകൾ വീണ്ടും ശരിയായി ലോഡ് ആകും.',
        'ആപ്പ് വഴിയുള്ള പേയ്‌മെന്റുകൾ ഇടപാട് ചരിത്രത്തിൽ നേരത്തെ കാണിക്കും.',
      ],
      newTitle: 'ഈ അപ്‌ഡേറ്റിലെ പുതിയവ',
      features: [
        'അവസാന തീയതി കഴിഞ്ഞ് 2 ദിവസം വരെ ലക്ഷ്യം തുറന്നിരിക്കും; പിന്നീട് കാലാവധി കഴിഞ്ഞതായി കാണിക്കും. നിങ്ങളുടെ ജപം സൂക്ഷിക്കപ്പെടും.',
        'Goal Complete: ലക്ഷ്യം നീട്ടുമ്പോൾ പുതിയ അവസാന തീയതി തിരഞ്ഞെടുക്കാം.',
      ],
    },
    mr: {
      fixedTitle: 'या अपडेटमध्ये काय दुरुस्त केले',
      fixed: [
        'तुमच्या जपमध्ये "Change deadline" उघडल्यावर ॲप बंद होणार नाही.',
        'माझे ऑर्डर पुन्हा व्यवस्थित लोड होतील.',
        'ॲपद्वारे केलेली पेमेंट्स व्यवहार इतिहासात लवकर दिसतील.',
      ],
      newTitle: 'या अपडेटमध्ये नवीन',
      features: [
        'मुदत संपल्यानंतर 2 दिवसांपर्यंत ध्येय खुले राहील, नंतर ते कालबाह्य दिसेल. तुमचे जप सुरक्षित राहतील.',
        'Goal Complete: ध्येय वाढवताना नवीन शेवटची तारीख निवडता येईल.',
      ],
    },
    bn: {
      fixedTitle: 'এই আপডেটে যা ঠিক করা হয়েছে',
      fixed: [
        'আপনার জপ: "Change deadline" খুললে অ্যাপ বন্ধ হবে না।',
        'আমার অর্ডার আবার ঠিকভাবে লোড হবে।',
        'অ্যাপের মাধ্যমে করা পেমেন্ট লেনদেনের ইতিহাসে আগে দেখা যাবে।',
      ],
      newTitle: 'এই আপডেটে নতুন',
      features: [
        'সময়সীমার পর ২ দিন পর্যন্ত লক্ষ্য খোলা থাকবে, তারপর মেয়াদোত্তীর্ণ দেখাবে। আপনার জপ সংরক্ষিত থাকবে।',
        'Goal Complete: লক্ষ্য বাড়ানোর সময় নতুন শেষ তারিখ বেছে নিতে পারবেন।',
      ],
    },
    or: {
      fixedTitle: 'ଏହି ଅପଡେଟରେ ଯାହା ଠିକ୍ କରାଯାଇଛି',
      fixed: [
        'ଆପଣଙ୍କ ଜପ: "Change deadline" ଖୋଲିଲେ ଆପ୍ ବନ୍ଦ ହେବ ନାହିଁ।',
        'ମୋ ଅର୍ଡର ପୁଣି ଠିକ୍ ଭାବେ ଲୋଡ ହେବ।',
        'ଆପ୍ ଦ୍ୱାରା ହୋଇଥିବା ପେମେଣ୍ଟ ଲେନଦେନ ଇତିହାସରେ ଶୀଘ୍ର ଦେଖାଯିବ।',
      ],
      newTitle: 'ଏହି ଅପଡେଟରେ ନୂଆ',
      features: [
        'ଶେଷ ତାରିଖ ପରେ 2 ଦିନ ପର୍ଯ୍ୟନ୍ତ ଲକ୍ଷ୍ୟ ଖୋଲା ରହିବ, ପରେ ମିଆଦ ଶେଷ ଦେଖାଯିବ। ଆପଣଙ୍କ ଜପ ସୁରକ୍ଷିତ ରହିବ।',
        'Goal Complete: ଲକ୍ଷ୍ୟ ବଢ଼ାଇବା ସମୟରେ ନୂଆ ଶେଷ ତାରିଖ ବାଛିପାରିବେ।',
      ],
    },
  },
};

/** Notes for the given release version and language (English fallback). */
export const getAppReleaseNotes = (
  version: string,
  lang?: string | null,
): AppReleaseNotes | null => {
  const byLang = NOTES[String(version || '').trim()];
  if (!byLang) {
    return null;
  }
  const code = String(lang || '').trim().toLowerCase();
  return byLang[code] || byLang.en || null;
};
