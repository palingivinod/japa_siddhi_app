import {AppIconName} from '../components/icons/AppIcon';

export interface LocalizedReward {
  title: Record<string, string>;
  description: Record<string, string>;
  emoji: string;
  imageName?: AppIconName;
}

const REWARD_LOCALIZATIONS: Array<{
  match: (name: string) => boolean;
  content: LocalizedReward;
}> = [
  // 1. Spatik Mala / Sphatik / Crystal
  {
    match: name => {
      const lower = name.toLowerCase();
      return (
        lower.includes('spatik') ||
        lower.includes('sphatik') ||
        lower.includes('crystal') ||
        lower.includes('quartz') ||
        lower.includes('స్పటిక') ||
        lower.includes('स्फटिक')
      );
    },
    content: {
      emoji: '📿',
      imageName: 'spatikaMala',
      title: {
        en: 'Spatik Mala',
        te: 'స్పటిక మాల',
        hi: 'स्फटिक माला',
        ta: 'ஸ்படிக மாலை',
        kn: 'ಸ್ಫಟಿಕ ಮಾಲೆ',
        ml: 'സ്ഫടിക മാല',
        mr: 'स्फटिक माळ',
        bn: 'স্ফটিক মালা',
        or: 'ସ୍ଫଟିକ ମାଳା',
      },
      description: {
        en: 'Natural clear quartz crystal (Sphatik) beads known for radiating soothing cooling energy, purifying vibrations, and mental tranquility.',
        te: 'చలువ చేసే శక్తి, ప్రశాంతత మరియు ఆధ్యాత్మిక పవిత్రతను ప్రసాదించే సహజ స్వచ్ఛమైన స్పటిక మాల.',
        hi: 'शीतलता, मानसिक शांति और सकारात्मक आध्यात्मिक ऊर्जा प्रदान करने वाली प्राकृतिक शुद्ध स्फटिक माला।',
        ta: 'குளிர்ச்சியூட்டும் சக்தி, மன அமைதி மற்றும் ஆன்மீக தூய்மையை வழங்கும் தூய ஸ்படிக மாலை.',
        kn: 'ಶಾಂತತೆ, ಮಾನಸಿಕ ನೆಮ್ಮದಿ ಮತ್ತು ಧನಾತ್ಮಕ ಆಧ್ಯಾತ್ಮಿಕ ಶಕ್ತಿಯನ್ನು ನೀಡುವ ನೈಸರ್ಗಿಕ ಸ್ಫಟಿಕ ಮಾಲೆ.',
        ml: 'മനസ്സിന് ശാന്തിയും കുളിർമയും ആത്മീയ ശുദ്ധിയും നൽകുന്ന ശുദ്ധമായ സ്ഫടിക മാല.',
        mr: 'शीतलता, मानसिक शांतता आणि सकारात्मक ऊर्जा प्रदान करणारी नैसर्गिक शुद्ध स्फटिक माळ.',
        bn: 'প্রাকৃতিক স্ফটিক পুঁতি যা শীতল অনুভূতি, মানসিক শান্তি ও ইতিবাচক আধ্যাত্মিক শক্তি প্রদান করে।',
        or: 'ମାନସିକ ଶାନ୍ତି, ଶୀତଳତା ଏବଂ ଆଧ୍ୟାତ୍ମିକ ପବିତ୍ରତା ପ୍ରଦାନ କରୁଥିବା ପ୍ରାକୃତିକ ସ୍ଫଟିକ ମାଳା।',
      },
    },
  },

  // 2. Pasupu Mala / Turmeric Mala
  {
    match: name => {
      const lower = name.toLowerCase();
      return (
        lower.includes('pasupu') ||
        lower.includes('turmeric') ||
        lower.includes('haldi')
      );
    },
    content: {
      emoji: '🌿',
      imageName: 'pasupuKommulaMala',
      title: {
        en: 'Pasupu Mala',
        te: 'పసుపు మాల',
        hi: 'हल्दी माला',
        ta: 'மஞ்சள் மாலை',
        kn: 'ಅರಿಶಿನ ಮಾಲೆ',
        ml: 'മഞ്ഞൾ മാല',
        mr: 'हळदीची माळ',
        bn: 'হলুদ মালা',
        or: 'ହଳଦୀ ମାଳା',
      },
      description: {
        en: 'Sacred natural whole turmeric beads embodying the divine blessings of Goddess Lakshmi, health, purity, and spiritual auspiciousness.',
        te: 'లక్ష్మీదేవి అనుగ్రహం, ఆరోగ్యం, సౌభాగ్యం మరియు పవిత్రతను చేకూర్చే సహజ పసుపు కొమ్ముల మాల.',
        hi: 'माता लक्ष्मी की कृपा, आरोग्य, शुद्धि और सौभाग्य का प्रतीक पवित्र प्राकृतिक हल्दी की गांठों वाली माला।',
        ta: 'லட்சுமி தேவியின் அருள், நலம், தூய்மை மற்றும் மங்கலகரமான ஆற்றலை வழங்கும் புனித மஞ்சள் கிழங்கு மாலை.',
        kn: 'ಲಕ್ಷ್ಮೀ ದೇವಿಯ ಕೃಪೆ, ಆರೋಗ್ಯ, ಪಾವಿತ್ರ್ಯ ಮತ್ತು ಸೌಭಾಗ್ಯವನ್ನು ಕರುಣಿಸುವ ಪವಿತ್ರ ನೈಸರ್ಗಿಕ ಅರಿಶಿನದ ಕೊಂಬಿನ ಮಾಲೆ.',
        ml: 'ലക്ഷ്മീദേവിയുടെ അനുഗ്രഹവും ആരോഗ്യവും ഐശ്വര്യവും പ്രദാനം ചെയ്യുന്ന പവിത്രമായ മഞ്ഞൾ മാല.',
        mr: 'माता लक्ष्मीचा आशीर्वाद, आरोग्य आणि मांगल्याचे प्रतीक असलेली पवित्र नैसर्गिक हळदीची माळ.',
        bn: 'মা লক্ষ্মীর আশীর্বাদ, সুস্বাস্থ্য, পবিত্রতা ও সৌভাগ্যের প্রতীক পবিত্র প্রাকৃতিক হলুদের মালা।',
        or: 'ମା\' ଲକ୍ଷ୍ମୀଙ୍କ କୃପା, ଆରୋଗ୍ୟ ଏବଂ ମାଙ୍ଗଲ୍ୟର ପ୍ରତୀକ ପବିତ୍ର ପ୍ରାକୃତିକ ହଳଦୀ ଗଣ୍ଠି ମାଳା।',
      },
    },
  },

  // 3. Karungali Mala (Ebony Wood Mala)
  {
    match: name => {
      const lower = name.toLowerCase();
      return (
        lower.includes('karungali') ||
        lower.includes('ebony') ||
        lower.includes('sacred japa mala') ||
        lower.includes('black wood') ||
        lower.includes('కరుంగాలి') ||
        lower.includes('கருங்காலி') ||
        lower.includes('करुंगली')
      );
    },
    content: {
      emoji: '📿',
      imageName: 'karungaliMala',
      title: {
        en: 'Karungali Mala',
        te: 'కరుంగాలి మాల',
        hi: 'करुंगली माला',
        ta: 'கருங்காலி மாலை',
        kn: 'ಕರುಂಗಾಲಿ ಮಾಲೆ',
        ml: 'കരുങ്കാലി മാല',
        mr: 'करुंगली माळ',
        bn: 'করুঙ্গালি মালা',
        or: 'କରୁଙ୍ଗାଲି ମାଳା',
      },
      description: {
        en: 'Sacred natural Ebony wood (Karungali) beads renowned for warding off negative energies, grounding cosmic vibrations, and enhancing spiritual discipline.',
        te: 'ప్రతికూల శక్తులను నివారించి, గ్రహ దోషాలను తొలగించి ఆధ్యాత్మిక శక్తిని ప్రసాదించే సహజ నల్ల కరుంగాలి మాల.',
        hi: 'नकारात्मक ऊर्जा और ग्रह दोषों को दूर कर आध्यात्मिक शक्ति व संकल्प प्रदान करने वाली पवित्र करुंगली माला।',
        ta: 'எதிர்மறை ஆற்றல்களை நீக்கி, நவகிரக தோஷங்களைக் குறைத்து ஆன்மீக பலம் தரும் புனித கருங்காலி மாலை.',
        kn: 'ನಕಾರಾತ್ಮಕ ಶಕ್ತಿಗಳನ್ನು ನಿವಾರಿಸಿ, ಆತ್ಮವಿಶ್ವಾಸ ಮತ್ತು ಆಧ್ಯಾತ್ಮಿಕ ಶಕ್ತಿಯನ್ನು ಹೆಚ್ಚಿಸುವ ಪವಿತ್ರ ಕರುಂಗಾಲಿ ಮಾಲೆ.',
        ml: 'നെഗറ്റീവ് ഊർജ്ജങ്ങളെ അകറ്റി ആത്മീയ ഏകാഗ്രതയും അനുഗ്രഹവും നൽകുന്ന പവിത്രമായ കരുങ്കാലി മാല.',
        mr: 'नकारात्मक ऊर्जा दूर करून सकारात्मक शक्ती व आध्यात्मिक सामर्थ्य देणारी पवित्र करुंगली माळ.',
        bn: 'নেতিবাচক শক্তি দূর করে আত্মবিশ্বাস ও আধ্যাত্মিক শক্তি বৃদ্ধি করতে সহায়ক পবিত্র করুঙ্গালি মালা।',
        or: 'ନକାରାତ୍ମକ ଶକ୍ତିକୁ ଦୂର କରି ଆଧ୍ୟାତ୍ମିକ ସାଧନା ଓ ସୁରକ୍ଷା ପ୍ରଦାନ କରୁଥିବା ପବିତ୍ର କରୁଙ୍ଗାଲି ମାଳା।',
      },
    },
  },

  // 4. Green Agate / Green Hakik
  {
    match: name => {
      const lower = name.toLowerCase();
      return (
        lower.includes('green agate') ||
        (lower.includes('green') && lower.includes('hakik')) ||
        (lower.includes('green') && lower.includes('agate'))
      );
    },
    content: {
      emoji: '💎',
      imageName: 'greenAgate',
      title: {
        en: 'Green Agate',
        te: 'గ్రీన్ అగేట్ (పచ్చ హకీక్)',
        hi: 'हरा अकीक (ग्रीन अगेट)',
        ta: 'பச்சை அகேட் கல்',
        kn: 'ಹಸಿರು ಅಗೇಟ್ (ಗ್ರೀನ್ ಹಕೀಕ್)',
        ml: 'ഗ്രീൻ അഗേറ്റ്',
        mr: 'हिरवा अकीक',
        bn: 'সবুজ আকিক',
        or: 'ସବୁଜ ଆକିକ',
      },
      description: {
        en: 'Natural green agate gemstone revered for emotional balance, heart chakra harmony, prosperity, and soothing protection.',
        te: 'మానసిక సమతుల్యత, హృదయ చక్ర శాంతి, సంపద మరియు రక్షణను కలిగించే సహజ గ్రీన్ అగేట్ (పచ్చ హకీక్).',
        hi: 'मानसिक संतुलन, हृदय चक्र की शांति, सुख-समृद्धि और सकारात्मक सुरक्षा देने वाला प्राकृतिक हरा अकीक (ग्रीन अगेट)।',
        ta: 'மன அமைதி, இதய சக்கர சமநிலை, வளம் மற்றும் பாதுகாப்பு அளிக்கும் இயற்கை பச்சை அகேட் கல்.',
        kn: 'ಭಾವನಾತ್ಮಕ ಸಮತೋಲನ, ಸುಖ-ಶಾಂತಿ ಮತ್ತು ರಕ್ಷಣೆ ನೀಡುವ ನೈಸರ್ಗಿಕ ಗ್ರೀನ್ ಅಗೇಟ್ (ಹಸಿರು ಹಕೀಕ್).',
        ml: 'മനസ്സിന് സമനിലയും ഐശ്വര്യവും ആത്മീയ സംരക്ഷണവും നൽകുന്ന പ്രകൃതിദത്ത ഗ്രീൻ അഗേറ്റ്.',
        mr: 'मानसिक शांती, समृद्धी आणि सकारात्मक संरक्षण देणारा नैसर्गिक हिरवा अकीक (ग्रीन अगेट).',
        bn: 'মানসিক ভারসাম্য, সমৃদ্ধি ও সুরক্ষা প্রদানকারী প্রাকৃতিক সবুজ আকিক (গ্রিন অ্যাগেট)।',
        or: 'ମାନସିକ ଶାନ୍ତି, ସମୃଦ୍ଧି ଏବଂ ଆଧ୍ୟାତ୍ମିକ ସୁରକ୍ଷା ପ୍ରଦାନ କରୁଥିବା ପ୍ରାକୃତିକ ସବୁଜ ଆକିକ (ଗ୍ରୀନ୍ ଆଗେଟ୍)।',
      },
    },
  },

  // 5. Yellow Agate / Yellow Hakik
  {
    match: name => {
      const lower = name.toLowerCase();
      return (
        lower.includes('yellow agate') ||
        (lower.includes('yellow') && lower.includes('hakik')) ||
        (lower.includes('yellow') && lower.includes('agate'))
      );
    },
    content: {
      emoji: '💎',
      imageName: 'yellowAgate',
      title: {
        en: 'Yellow Agate',
        te: 'ఎల్లో అగేట్ (పసుపు హకీక్)',
        hi: 'पीला अकीक (येलो अगेट)',
        ta: 'மஞ்சள் அகேட் கல்',
        kn: 'ಹಳದಿ ಅಗೇಟ್ (ಯೆಲ್ಲೋ ಹಕೀಕ್)',
        ml: 'യെല്ലോ അഗേറ്റ്',
        mr: 'पिवळा अकीक',
        bn: 'হলুদ আকিক',
        or: 'ହଳଦିଆ ଆକିକ',
      },
      description: {
        en: 'Auspicious yellow agate gemstone associated with wisdom, knowledge, inner strength, and divine blessings from Jupiter (Brihaspati).',
        te: 'జ్ఞానం, అంతర్గత శక్తి, సద్బుద్ధి మరియు బృహస్పతి అనుగ్రహాన్ని అందించే పవిత్ర ఎల్లో అగేట్ (పసుపు హకీక్).',
        hi: 'ज्ञान, आत्मबल, एकाग्रता और गुरु बृहस्पति की कृपा प्रदान करने वाला शुभ पीला अकीक (येलो अगेट)।',
        ta: 'ஞானம், மன உறுதி மற்றும் குரு பகவானின் அருளைப் பெற்றுத் தரும் மங்களகரமான மஞ்சள் அகேட் கல்.',
        kn: 'ಜ್ಞಾನ, ಆಂತರಿಕ ಶಕ್ತಿ ಮತ್ತು ಗುರು ಬೃಹಸ್ಪತಿಯ ಅನುಗ್ರಹ ನೀಡುವ ಮಂಗಳಕರ ಹಳದಿ ಅಗೇಟ್ (ಯೆಲ್ಲೋ ಹಕೀಕ್).',
        ml: 'ജ്ഞാനവും ആത്മവിശ്വാസവും ഗുരു കടാക്ഷവും പ്രധാനം ചെയ്യുന്ന വിശുദ്ധ യെല്ലോ അഗേറ്റ്.',
        mr: 'ज्ञान, बुद्धिमत्ता आणि गुरु कृपा प्राप्त करून देणारा शुभ पिवळा अकीक (येलो अगेट).',
        bn: 'জ্ঞান, আত্মবিশ্বাস ও বৃহস্পতির আশীর্বাদ প্রদানকারী শুভ হলুদ আকিক (ইয়েলো অ্যাগেট)।',
        or: 'ଜ୍ଞାନ, ଆତ୍ମବଳ ଏବଂ ଗୁରୁ ବୃହସ୍ପତିଙ୍କ କୃପା ପ୍ରଦାନ କରୁଥିବା ଶୁଭ ହଳଦିଆ ଆକିକ (ୟେଲୋ ଆଗେଟ୍)।',
      },
    },
  },

  // 6. Rudraksha Mala / Rudrakshi
  {
    match: name => name.toLowerCase().includes('rudraksh'),
    content: {
      emoji: '📿',
      title: {
        en: 'Rudrakshi Mala',
        te: 'రుద్రాక్ష మాల',
        hi: 'रुद्राक्ष माला',
        ta: 'ருத்ராட்ச மாலை',
        kn: 'ರುದ್ರಾಕ್ಷಿ ಮಾಲೆ',
        ml: 'രുദ്രാക്ഷ മാല',
        mr: 'रुद्राक्ष माळ',
        bn: 'রুদ্রাক্ষ মালা',
        or: 'ରୁଦ୍ରାକ୍ଷ ମାଳା',
      },
      description: {
        en: 'Sacred divine seed beads blessed by Lord Shiva that foster inner serenity, spiritual aura protection, and deep meditative focus.',
        te: 'శివానుగ్రహం, మానసిక ప్రశాంతత, ఆధ్యాత్మిక రక్షణ మరియు ఏకాగ్రతను ప్రసాదించే పవిత్ర రుద్రాక్ష మాల.',
        hi: 'भगवान शिव के आशीर्वाद से युक्त, मानसिक शांति, आध्यात्मिक सुरक्षा और ध्यान-एकाग्रता देने वाली पवित्र रुद्राक्ष माला।',
        ta: 'சிவபெருமானின் அருள், மன அமைதி மற்றும் ஆன்மீக பாதுகாப்பை அருளும் புனித ருத்ராட்ச மாலை.',
        kn: 'ಶಿವನ ಅನುಗ್ರಹ, ಮನಸ್ಸಿನ ಶಾಂತಿ, ಆಧ್ಯಾತ್ಮಿಕ ರಕ್ಷಣೆ ಮತ್ತು ಏಕಾಗ್ರತೆಯನ್ನು ಕರುಣಿಸುವ ಪವಿತ್ರ ರುದ್ರಾಕ್ಷಿ ಮಾಲೆ.',
        ml: 'ശിവന്റെ അനുഗ്രഹവും മനസ്സിന് ശാന്തിയും ആത്മീയ സംരക്ഷണവും നൽകുന്ന പവിത്രമായ രുദ്രാക്ഷ മാല.',
        mr: 'भगवान शिवांचा कृपाप्रसाद, मनःशांती आणि आध्यात्मिक संरक्षण देणारी पवित्र रुद्राक्ष माळ.',
        bn: 'ভগবান শিবের আশীর্বাদপ্রাপ্ত, মানসিক শান্তি ও একাগ্রতা বৃদ্ধিকারী পবিত্র রুদ্রাক্ষ মালা।',
        or: 'ଭଗବାନ ଶିବଙ୍କ କୃପା, ମାନସିକ ଶାନ୍ତି ଏବଂ ଆଧ୍ୟାତ୍ମିକ ସୁରକ୍ଷା ପ୍ରଦାନ କରୁଥିବା ପବିତ୍ର ରୁଦ୍ରାକ୍ଷ ମାଳା।',
      },
    },
  },

  // 7. Tulasi Mala / Tulsi
  {
    match: name => name.toLowerCase().includes('tulsi') || name.toLowerCase().includes('tulasi'),
    content: {
      emoji: '📿',
      title: {
        en: 'Tulasi Mala',
        te: 'తులసి మాల',
        hi: 'तुलसी माला',
        ta: 'துளசி மாலை',
        kn: 'ತುಳಸಿ ಮಾಲೆ',
        ml: 'തുളസി മാല',
        mr: 'तुळशी माळ',
        bn: 'তুলসী মালা',
        or: 'ତୁଳସୀ ମାଳା',
      },
      description: {
        en: 'Pure consecrated Tulsi wood rosary revered for spiritual sanctity, purifying the aura, and devotion to Lord Vishnu and Krishna.',
        te: 'శ్రీహరి భక్తి, ఆత్మశుద్ధి, పవిత్రత మరియు ప్రశాంతతను అందించే అత్యంత పవిత్రమైన తులసి మాల.',
        hi: 'भगवान विष्णु और श्रीकृष्ण की कृपा, आध्यात्मिक शुद्धि और शांति प्रदान करने वाली परम पवित्र तुलसी माला।',
        ta: 'பெருமாளின் அருள், ஆன்மீக தூய்மை மற்றும் மன நிம்மதியைத் தரும் புனித துளசி மாலை.',
        kn: 'ವಿಷ್ಣು-ಕೃಷ್ಣರ ಕೃಪೆ, ಪಾವಿತ್ರ್ಯ ಮತ್ತು ಮನಃಶಾಂತಿಯನ್ನು ನೀಡುವ ಪವಿತ್ರ ತುಳಸಿ ಮಾಲೆ.',
        ml: 'ഭഗവാൻ വിഷ്ണുവിന്റെ കൃപയും ആത്മീയ വിശുദ്ധിയും നൽകുന്ന പവിത്രമായ തുളസി മാല.',
        mr: 'श्रीविष्णू आणि श्रीकृष्ण भक्ती, आंतरिक शुद्धता व शांती देणारी पवित्र तुळशी माळ.',
        bn: 'ভগবান বিষ্ণু ও শ্রীকৃষ্ণের ভক্তি এবং আত্মশুদ্ধি প্রদানকারী পরম পবিত্র তুলসী মালা।',
        or: 'ପ୍ରଭୁ ଶ୍ରୀବିଷ୍ଣୁଙ୍କ କୃପା, ଆତ୍ମଶୁଦ୍ଧି ଏବଂ ଶାନ୍ତି ପ୍ରଦାନ କରୁଥିବା ପରମ ପବିତ୍ର ତୁଳସୀ ମାଳା।',
      },
    },
  },

  // 8. Chandan / Sandalwood Mala
  {
    match: name => {
      const lower = name.toLowerCase();
      return lower.includes('chandan') || lower.includes('sandal');
    },
    content: {
      emoji: '📿',
      title: {
        en: 'Chandan Mala',
        te: 'చందన మాల',
        hi: 'चंदन माला',
        ta: 'சந்தன மாலை',
        kn: 'ಶ್ರೀಗಂಧದ ಮಾಲೆ',
        ml: 'ചന്ദന മാല',
        mr: 'चंदनाची माळ',
        bn: 'চন্দন মালা',
        or: 'ଚନ୍ଦନ ମାଳା',
      },
      description: {
        en: 'Natural fragrant sandalwood beads that bestow profound calmness, cooling comfort, stress relief, and spiritual serenity.',
        te: 'సుగంధ పరిమళాలు, ప్రశాంతత, చలువదనం మరియు మానసిక ఉపశమనాన్ని కలిగించే సహజ చందన మాల.',
        hi: 'दिव्य सुगंध, शीतलता, तनावमुक्ति और असीम मानसिक शांति प्रदान करने वाली प्राकृतिक चंदन माला।',
        ta: 'நறுமணம், குளிர்ச்சி, மன அமைதி மற்றும் ஆன்மீக சாந்தியை அளிக்கும் இயற்கை சந்தன மாலை.',
        kn: 'ಸುಗಂಧ, ತಂಪು, ಮಾನಸಿಕ ನೆಮ್ಮದಿ ಮತ್ತು ಆಧ್ಯಾತ್ಮಿಕ ಶಾಂತಿಯನ್ನು ನೀಡುವ ನೈಸರ್ಗಿಕ ಶ್ರೀಗಂಧದ ಮಾಲೆ.',
        ml: 'സുഗന്ധവും കുളിർമയും മാനസിക സമാധാനവും നൽകുന്ന സ്വാഭാവിക ചന്ദന മാല.',
        mr: 'दिव्य सुवास, शीतलता आणि मनःशांती प्रदान करणारी नैसर्गिक चंदनाची माळ.',
        bn: 'মনোহর সুবাস, স্নিগ্ধতা ও মানসিক প্রশান্তি প্রদানকারী প্রাকৃতিক চন্দন কাঠের মালা।',
        or: 'ଦିବ୍ୟ ସୁଗନ୍ଧ, ଶୀତଳତା ଏବଂ ମାନସିକ ଶାନ୍ତି ପ୍ରଦାନ କରୁଥିବା ପ୍ରାକୃତିକ ଚନ୍ଦନ ମାଳା।',
      },
    },
  },

  // 9. Kamal Gatta / Lotus Seed Mala
  {
    match: name => {
      const lower = name.toLowerCase();
      return lower.includes('kamal') || lower.includes('lotus');
    },
    content: {
      emoji: '📿',
      title: {
        en: 'Kamal Gatta Mala',
        te: 'కమల గట్ట మాల',
        hi: 'कमलगट्टा माला',
        ta: 'தாமரை விதை மாலை',
        kn: 'ಕಮಲದ ಬೀಜಗಳ ಮಾಲೆ',
        ml: 'താമരവിത്ത് മാല',
        mr: 'कमलगट्टा माळ',
        bn: 'পদ্মবীজের মালা',
        or: 'ପଦ୍ମବୀଜ ମାଳା',
      },
      description: {
        en: 'Sacred lotus seeds dedicated to Goddess Mahalakshmi, traditionally revered for inviting abundance, fortune, and prosperity.',
        te: 'మహాలక్ష్మీ దేవి అనుగ్రహం, ధనధాన్య వృద్ధి, ఐశ్వర్యం మరియు శుభాన్ని ఆకర్షించే కమల గట్ట మాల.',
        hi: 'माता महालक्ष्मी की असीम कृपा, धन, वैभव और सुख-समृद्धि को आकर्षित करने वाली पवित्र कमलगट्टे की माला।',
        ta: 'மகாலட்சுமியின் அருள், தன-தான்ய விருத்தி மற்றும் செல்வச் செழிப்பை ஈர்க்கும் தாமரை விதை மாலை.',
        kn: 'ಮಹಾಲಕ್ಷ್ಮಿಯ ಅನುಗ್ರಹ, ಧನ-ಸಂಪತ್ತು ಮತ್ತು ಅಭಿವೃದ್ಧಿಯನ್ನು ತರುವ ಪವಿತ್ರ ಕಮಲದ ಬೀಜಗಳ ಮಾಲೆ.',
        ml: 'മഹാലക്ഷ്മീദേവിയുടെ അനുഗ്രഹവും സമ്പത്തും ഐശ്വര്യവും ആകർഷിക്കുന്ന താമരവിത്ത് മാല.',
        mr: 'माता महालक्ष्मीचा आशीर्वाद, समृद्धी आणि ऐश्वर्य प्राप्त करून देणारी कमलगट्ट्याची माळ.',
        bn: 'মা মহালক্ষ্মীর আশীর্বাদ, ধনধান্য ও সমৃদ্ধি বৃদ্ধি করতে সহায়ক পদ্মবীজের মালা।',
        or: 'ମା\' ମହାଲକ୍ଷ୍ମୀଙ୍କ କୃପା, ଧନ-ଧାନ୍ୟ ଏବଂ ସୁଖ-ସମୃଦ୍ଧି ପ୍ରଦାନ କରୁଥିବା ପବିତ୍ର ପଦ୍ମବୀଜ ମାଳା।',
      },
    },
  },

  // 10. Gomati Chakra
  {
    match: name => {
      const lower = name.toLowerCase();
      return lower.includes('gomati') || lower.includes('chakra');
    },
    content: {
      emoji: '🐚',
      title: {
        en: 'Gomati Chakra',
        te: 'గోమతి చక్రం',
        hi: 'गोमती चक्र',
        ta: 'கோமதி சக்கரம்',
        kn: 'ಗೋಮತಿ ಚಕ್ರ',
        ml: 'ഗോമതി ചക്രം',
        mr: 'गोमती चक्र',
        bn: 'গোমতী চক্র',
        or: 'ଗୋମତୀ ଚକ୍ର',
      },
      description: {
        en: 'Sacred natural swirl shell from the holy Gomati River, celebrated for inviting wealth, positive vastu, and family welfare.',
        te: 'గోమతి నది పవిత్ర చక్రం, లక్ష్మీ కటాక్షం, వాస్తు శుభాలు మరియు కుటుంబ క్షేమాన్ని కలిగించే గోమతి చక్రం.',
        hi: 'पवित्र गोमती नदी से प्राप्त, सुख-समृद्धि, वास्तु दोष निवारण और पारिवारिक कल्याण का कारक गोमती चक्र।',
        ta: 'கோமதி நதியின் புனித சிப்பி, லட்சுமி கடாட்சம், வாஸ்து நன்மை மற்றும் குடும்ப நலம் தரும் கோமதி சக்கரம்.',
        kn: 'ಗೋಮತಿ ನದಿಯ ಪವಿತ್ರ ಕವಡೆ, ಲಕ್ಷ್ಮೀ ಕೃಪೆ, ವಾಸ್ತು ಶುಭ ಮತ್ತು ಕುಟುಂಬದ ಕ್ಷೇಮ ನೀಡುವ ಗೋಮತಿ ಚಕ್ರ.',
        ml: 'ഐശ്വര്യവും വാസ്തു ഗുണങ്ങളും കുടുംബ ക്ഷേമവും നൽകുന്ന പവിത്രമായ ഗോമതി ചക്രം.',
        mr: 'गोमती नदीतील पवित्र चक्र, जे समृद्धी, वास्तू दोष निवारण आणि कौटुंबिक कल्याण घडवून आणते.',
        bn: 'পবিত্র গোমতী নদীর শঙ্খচক্র, যা গৃহের সমৃদ্ধি, বাস্তু দোষ নিবারণ ও কল্যাণ বৃদ্ধি করে।',
        or: 'ପବିତ୍ର ଗୋମତୀ ନଦୀର ଶୁଭ ଚକ୍ର, ଯାହା ସୁଖ-ସମୃଦ୍ଧି, ବାସ୍ତୁ ଶୁଦ୍ଧି ଏବଂ ପାରିବାରିକ କଲ୍ୟାଣ ଆଣିଥାଏ।',
      },
    },
  },

  // 11. Shree Yantra
  {
    match: name => name.toLowerCase().includes('yantra'),
    content: {
      emoji: '🔯',
      title: {
        en: 'Shree Yantra',
        te: 'శ్రీ యంత్రం',
        hi: 'श्री यंत्र',
        ta: 'ஸ்ரீ யந்திரம்',
        kn: 'ಶ್ರೀ ಯಂತ್ರ',
        ml: 'ശ്രീ യന്ത്രം',
        mr: 'श्री यंत्र',
        bn: 'শ্রী যন্ত্র',
        or: 'ଶ୍ରୀ ଯନ୍ତ୍ର',
      },
      description: {
        en: 'Sacred geometric spiritual diagram that amplifies positive cosmic vibrations, harmony, and spiritual prosperity in the home.',
        te: 'దివ్య విశ్వ శక్తులను ఆకర్షించి, గృహంలో ఐశ్వర్యం, శాంతి మరియు ఆధ్యాత్మిక ఎదుగుదలను కలిగించే శ్రీ యంత్రం.',
        hi: 'घर में सकारात्मक ब्रह्मांडीय ऊर्जा, सुख-शांति, समृद्धि और आध्यात्मिक प्रगति को आकर्षित करने वाला श्री यंत्र।',
        ta: 'வீட்டில் நேர்மறை ஆற்றல், அமைதி, ஐஸ்வர்யம் மற்றும் ஆன்மீக வளர்ச்சியைப் பெருக்கும் ஸ்ரீ யந்திரம்.',
        kn: 'ಧನಾತ್ಮಕ ಬ್ರಹ್ಮಾಂಡ ಶಕ್ತಿ, ಶಾಂತಿ, ಐಶ್ವರ್ಯ ಮತ್ತು ಆಧ್ಯಾತ್ಮಿಕ ಉನ್ನತಿಯನ್ನು ಕರುಣಿಸುವ ಶ್ರೀ ಯಂತ್ರ.',
        ml: 'വീട്ടിൽ പോസിറ്റീവ് ഊർജ്ജവും ശാന്തിയും ഐശ്വര്യവും നിറയ്ക്കുന്ന വിശുദ്ധ ശ്രീ യന്ത്രം.',
        mr: 'घरात सकारात्मक ऊर्जा, सुख-समृद्धी आणि आध्यात्मिक शांती आणणारे अतिशय पवित्र श्री यंत्र.',
        bn: 'গৃহে ইতিবাচক মহাজাগতিক শক্তি, সুখ-শান্তি ও সমৃদ্ধি আকর্ষণকারী পবিত্র শ্রী যন্ত্র।',
        or: 'ଘରେ ସକାରାତ୍ମକ ବ୍ରହ୍ମାଣ୍ଡୀୟ ଶକ୍ତି, ସୁଖ-ଶାନ୍ତି ଏବଂ ସମୃଦ୍ଧି ବୃଦ୍ଧି କରୁଥିବା ପବିତ୍ର ଶ୍ରୀ ଯନ୍ତ୍ର।',
      },
    },
  },

  // 12. Bhagavad Gita / Holy Book
  {
    match: name => {
      const lower = name.toLowerCase();
      return (
        lower.includes('gita') ||
        lower.includes('book') ||
        lower.includes('scripture')
      );
    },
    content: {
      emoji: '📖',
      title: {
        en: 'Bhagavad Gita',
        te: 'శ్రీమద్ భగవద్గీత',
        hi: 'श्रीमद्भगवद्गीता',
        ta: 'புனித பகவத் கீதை',
        kn: 'ಶ್ರೀಮದ್ ಭಗವದ್ಗೀತೆ',
        ml: 'ഭഗവദ്ഗീത',
        mr: 'श्रीमद्भगवद्गीता',
        bn: 'শ্রীমদ্ভগবদ্গীতা',
        or: 'ଶ୍ରୀମଦ୍ଭଗବଦ୍ଗୀତା',
      },
      description: {
        en: 'Timeless spiritual scripture containing the profound divine wisdom, eternal truth, and philosophical guidance of Lord Krishna.',
        te: 'శ్రీకృష్ణ భగవానుని దివ్యోపదేశాలు, సనాతన ధర్మ విజ్ఞానం మరియు మోక్ష మార్గాన్ని చూపే పవిత్ర భగవద్గీత.',
        hi: 'भगवान श्रीकृष्ण के दिव्य उपदेश, शाश्वत सत्य और जीवन के मार्गदर्शन से परिपूर्ण अमर ग्रंथ श्रीमद्भगवद्गीता।',
        ta: 'ஸ்ரீகிருஷ்ணரின் தெய்வீக உபதேசம், நித்திய உண்மை மற்றும் வாழ்க்கைப் பாதையைக் காட்டும் புனித பகவத் கீதை.',
        kn: 'ಶ್ರೀಕೃಷ್ಣನ ದಿವ್ಯೋಪದೇಶ, ಶಾಶ್ವತ ಸತ್ಯ ಮತ್ತು ಜೀವನ ಮಾರ್ಗದರ್ಶನ ನೀಡುವ ಪವಿತ್ರ ಭಗವದ್ಗೀತೆ.',
        ml: 'ശ്രീകൃഷ്ണ ഭഗവാന്റെ ദിവ്യോപദേശങ്ങളും നിത്യസത്യങ്ങളും നിറഞ്ഞ പുണ്യഗ്രന്ഥം ഭഗവദ്ഗീത.',
        mr: 'भगवान श्रीकृष्णांचे दिव्य उपदेश आणि जीवन मार्गदर्शन देणारा अमर ग्रंथ श्रीमद्भगवद्गीता.',
        bn: 'ভগবান শ্রীকৃষ্ণের দিব্য উপদেশ ও সনাতন জ্ঞানের আধার পরম পবিত্র শ্রীমদ্ভগবদ্গীতা।',
        or: 'ଭଗବାନ ଶ୍ରୀକୃଷ୍ଣଙ୍କ ଦିବ୍ୟ ଉପଦେଶ ଏବଂ ଶାଶ୍ୱତ ସତ୍ୟରେ ପରିପୂର୍ଣ୍ଣ ପବିତ୍ର ଶ୍ରୀମଦ୍ଭଗବଦ୍ଗୀତା।',
      },
    },
  },

  // 13. Temple Prasadam
  {
    match: name => {
      const lower = name.toLowerCase();
      return (
        lower.includes('prasadam') ||
        lower.includes('prasad') ||
        lower.includes('sweet')
      );
    },
    content: {
      emoji: '🍯',
      title: {
        en: 'Temple Prasadam',
        te: 'దివ్య ప్రసాదం',
        hi: 'मंदिर प्रसादम',
        ta: 'கோயில் பிரசாதம்',
        kn: 'ದೇವಾಲಯದ ಪ್ರಸಾದ',
        ml: 'ക്ഷേത്ര പ്രസാദം',
        mr: 'मंदिर प्रसाद',
        bn: 'মন্দির প্রসাদ',
        or: 'ମନ୍ଦିର ପ୍ରସାଦ',
      },
      description: {
        en: 'Sacred consecrated temple offering blessed with sanctified prayers and pure divine grace.',
        te: 'దేవాలయ గర్భగుడిలో పవిత్ర పూజలతో అభిమంత్రించబడిన దివ్య ప్రసాదం.',
        hi: 'पवित्र मंत्रोच्चार और देव पूजा से अभिमंत्रित अत्यंत पावन दिव्य मंदिर प्रसादम।',
        ta: 'திருக்கோயில் பூஜையில் வைத்து வழிபடப்பட்ட புனிதமான பிரசாதம்.',
        kn: 'ದೇವಾಲಯದ ಪೂಜೆಯಿಂದ ಪಾವಿತ್ರ್ಯಗೊಂಡ ದಿವ್ಯ ಪ್ರಸಾದ.',
        ml: 'ക്ഷേത്ര ശ്രീകോവിലിൽ പൂജിച്ചു നൽകിയ പവിത്രമായ പ്രസാദം.',
        mr: 'मंदिरातील विधिवत पूजेने पवित्र झालेला अत्यंत पावन प्रसाद.',
        bn: 'মন্দিরের পবিত্র পূজায় নিবেদিত পরম কল্যাণময় দিব্য প্রসাদ।',
        or: 'ମନ୍ଦିରର ପବିତ୍ର ପୂଜାର୍ଚ୍ଚନାରୁ ପ୍ରାପ୍ତ ଦିବ୍ୟ ମହାପ୍ରସାଦ।',
      },
    },
  },

  // 14. Baanalingam / Shiva Lingam
  {
    match: name => {
      const lower = name.toLowerCase();
      return (
        lower.includes('lingam') ||
        lower.includes('shiva') ||
        lower.includes('baanalingam')
      );
    },
    content: {
      emoji: '🕉️',
      title: {
        en: 'Narmada Baanalingam',
        te: 'నర్మదా బాణలింగం',
        hi: 'नर्मदा बाणलिंगम्',
        ta: 'நர்மதா பாணலிங்கம்',
        kn: 'ನರ್ಮದಾ ಬಾಣಲಿಂಗ',
        ml: 'നർമ്മദാ ബാണലിംഗം',
        mr: 'नर्मदा बाणलिंग',
        bn: 'নর্মদা বাণলিঙ্গ',
        or: 'ନର୍ମଦା ବାଣଲିଙ୍ଗ',
      },
      description: {
        en: 'Self-manifested sacred stone from the holy Narmada River, representing the eternal cosmic consciousness of Lord Shiva.',
        te: 'నర్మదా నదీ తీరంలో సహజసిద్ధంగా వెలిసిన పరమశివుని సాక్షాత్ స్వరూపమైన పవిత్ర బాణలింగం.',
        hi: 'पवित्र नर्मदा नदी से प्राप्त, भगवान शिव के साक्षात स्वरूप का प्रतीक स्वयंभू बाणलिंगम्।',
        ta: 'புனித நர்மதா நதியில் சுயம்புவாகத் தோன்றிய சிவபெருமானின் புனித பாணலிங்கம்.',
        kn: 'ಪವಿತ್ರ ನರ್ಮದಾ ನದಿಯಲ್ಲಿ ಸ್ವಯಂಭೂವಾಗಿ ಉದ್ಭವಿಸಿದ ಪರಮಶಿವನ ಸಾಕ್ಷಾತ್ ಸ್ವರೂಪ ಬಾಣಲಿಂಗ.',
        ml: 'പവിത്രമായ നർമ്മദാ നദിയിൽ സ്വയംഭൂവായി രൂപംകൊണ്ട ശിവസ്വരൂപമായ ബാണലിംഗം.',
        mr: 'पवित्र नर्मदा नदीतून प्राप्त, भगवान शिवांचे साक्षात प्रतीक असलेले स्वयंभू बाणलिंग.',
        bn: 'পবিত্র নর্মদা নদী থেকে প্রাপ্ত, ভগবান শিবের চিরন্তন স্বরূপ স্বয়ম্ভূ বাণলিঙ্গ।',
        or: 'ପବିତ୍ର ନର୍ମଦା ନଦୀରୁ ପ୍ରାପ୍ତ, ଭଗବାନ ଶିବଙ୍କ ସାକ୍ଷାତ୍ ପ୍ରତୀକ ସ୍ୱୟଂଭୂ ବାଣଲିଙ୍ଗ।',
      },
    },
  },

  // 15. Brass Diya / Deepam
  {
    match: name => {
      const lower = name.toLowerCase();
      return (
        lower.includes('diya') ||
        lower.includes('lamp') ||
        lower.includes('deepam')
      );
    },
    content: {
      emoji: '🪔',
      title: {
        en: 'Brass Diya',
        te: 'ఇత్తడి దీపం',
        hi: 'पीतल का दीया',
        ta: 'பித்தளை விளக்கு',
        kn: 'ಹಿತ್ತಾಳೆಯ ದೀಪ',
        ml: 'പിച്ചള വിളക്ക്',
        mr: 'पितळी दिवा',
        bn: 'পিতলের প্রদীপ',
        or: 'ପିତ୍ତଳ ଦୀପ',
      },
      description: {
        en: 'Traditional handcrafted brass lamp representing auspiciousness, spiritual illumination, and dispelling inner darkness.',
        te: 'మంగళకరం, దివ్య వెలుగు మరియు అంధకారాన్ని పారద్రోలే సాంప్రదాయ ఇత్తడి దీపం.',
        hi: 'शुभता, दिव्य प्रकाश और अंधकार को दूर करने वाला पारंपरिक पीतल का दीपक।',
        ta: 'மங்களம் மற்றும் இருளைப் போக்கும் பாரம்பரிய பித்தளை திருவிளக்கு.',
        kn: 'ಮಂಗಳಕರ, ದಿವ್ಯ ಜ್ಯೋತಿ ಮತ್ತು ಕತ್ತಲೆಯನ್ನು ಹೋಗಲಾಡಿಸುವ ಹಿತ್ತಾಳೆಯ ದೀಪ.',
        ml: 'ഐശ്വര്യവും പ്രകാശവും നൽകുന്ന പാരമ്പര്യ പിച്ചള വിളക്ക്.',
        mr: 'मांगल्य आणि प्रकाशाचे प्रतीक असलेला पारंपरिक पितळी दिवा.',
        bn: 'শুভ ও আলোর প্রতীক ঐতিহ্যবাহী পিতলের প্রদীপ।',
        or: 'ଶୁଭ ଏବଂ ଆଲୋକର ପ୍ରତୀକ ପାରମ୍ପରିକ ପିତ୍ତଳ ଦୀପ।',
      },
    },
  },
];

const FALLBACK_CONTENT: LocalizedReward = {
  emoji: '🎁',
  title: {
    en: 'Spiritual Reward',
    te: 'ఆధ్యాత్మిక కానుక',
    hi: 'आध्यात्मिक उपहार',
    ta: 'ஆன்மீக பரிசு',
    kn: 'ಆಧ್ಯಾತ್ಮಿಕ ಉಡುಗೊರೆ',
    ml: 'ആത്മീയ സമ്മാനം',
    mr: 'आध्यात्मिक भेट',
    bn: 'আধ্যাত্মিক উপহার',
    or: 'ଆଧ୍ୟାତ୍ମିକ ଉପହାର',
  },
  description: {
    en: 'Sacred consecrated spiritual offering infused with positive divine energy, peace, and spiritual auspiciousness.',
    te: 'దివ్య అనుగ్రహం, శాంతి మరియు మంగళాన్ని అందించే పవిత్ర ఆధ్యాత్మిక కానుక.',
    hi: 'सकारात्मक ऊर्जा, शांति और शुभाशीष से परिपूर्ण पावन आध्यात्मिक उपहार।',
    ta: 'நேர்மறை ஆற்றல், அமைதி மற்றும் மங்களம் தரும் புனித ஆன்மீக பரிசு.',
    kn: 'ಧನಾತ್ಮಕ ಶಕ್ತಿ, ಶಾಂತಿ ಮತ್ತು ಶುಭವನ್ನು ತರುವ పవిತ್ರ ಆಧ್ಯಾತ್ಮಿಕ ಉಡುಗೊರೆ.',
    ml: 'ശാന്തിയും ഐശ്വര്യവും പ്രദാനം ചെയ്യുന്ന പവിത്രമായ ആത്മീയ സമ്മാനം.',
    mr: 'सकारात्मक ऊर्जा आणि मांगल्याचा आशीर्वाद देणारी पवित्र आध्यात्मिक भेट.',
    bn: 'ইতিবাচক শক্তি ও শুভাশিস যুক্ত পরম পবিত্র আধ্যাত্মিক উপহার।',
    or: 'ସକାରାତ୍ମକ ଉର୍ଜା ଏବଂ ଶାନ୍ତି ପ୍ରଦାନ କରୁଥିବା ପବିତ୍ର ଆଧ୍ୟାତ୍ମିକ ଉପହାର।',
  },
};

export const getLocalizedReward = (
  rawName: string,
  lang: string = 'en',
): {title: string; description: string; emoji: string; imageName?: AppIconName} => {
  const name = String(rawName || '').trim();
  const matched = REWARD_LOCALIZATIONS.find(item => item.match(name));
  const content = matched ? matched.content : FALLBACK_CONTENT;

  const title =
    content.title[lang] ||
    content.title['en'] ||
    name ||
    'Spiritual Reward';
  const description =
    content.description[lang] ||
    content.description['en'] ||
    FALLBACK_CONTENT.description['en'];
  const emoji = content.emoji;
  const imageName = content.imageName;

  return {title, description, emoji, imageName};
};

export interface RewardEligibility {
  requiredJapas: number;
  requiredLabel: string;
  isEligible: boolean;
  remainingJapas: number;
}

const REQUIREMENT_LABELS: Record<string, {fiftyK: string; one: string; two: string}> = {
  te: {fiftyK: '50,000 (50 వేలు)', one: '1,00,000 (1 లక్ష)', two: '2,00,000 (2 లక్షలు)'},
  hi: {fiftyK: '50,000 (50 हज़ार)', one: '1,00,000 (1 लाख)', two: '2,00,000 (2 लाख)'},
  ta: {fiftyK: '50,000 (50 ஆயிரம்)', one: '1,00,000 (1 லட்சம்)', two: '2,00,000 (2 லட்சம்)'},
  kn: {fiftyK: '50,000 (50 ಸಾವಿರ)', one: '1,00,000 (1 ಲಕ್ಷ)', two: '2,00,000 (2 ಲಕ್ಷ)'},
  ml: {fiftyK: '50,000 (50 ആയിരം)', one: '1,00,000 (1 ലക്ഷം)', two: '2,00,000 (2 ലക്ഷം)'},
  mr: {fiftyK: '50,000 (50 हजार)', one: '1,00,000 (1 लाख)', two: '2,00,000 (2 लाख)'},
  bn: {fiftyK: '50,000 (50 হাজার)', one: '1,00,000 (1 লাখ)', two: '2,00,000 (2 লাখ)'},
  or: {fiftyK: '50,000 (50 ହଜାର)', one: '1,00,000 (1 ଲକ୍ଷ)', two: '2,00,000 (2 ଲକ୍ଷ)'},
  en: {fiftyK: '50,000 (50k)', one: '1,00,000 (1 Lakh)', two: '2,00,000 (2 Lakhs)'},
};

export const getRewardRequirement = (
  rewardName: string,
  lang: string = 'en',
): {count: number; label: string} => {
  const lower = String(rewardName || '').toLowerCase();
  const reqText = REQUIREMENT_LABELS[lang] || REQUIREMENT_LABELS.en;

  // Yellow Agate or Green Agate => 2,00,000 Japas (2 Lakhs)
  if (
    lower.includes('yellow agate') ||
    lower.includes('green agate') ||
    (lower.includes('yellow') && (lower.includes('agate') || lower.includes('hakik') || lower.includes('అగేట్') || lower.includes('अगेट'))) ||
    (lower.includes('green') && (lower.includes('agate') || lower.includes('hakik') || lower.includes('అగేట్') || lower.includes('अगेट')))
  ) {
    return {count: 200000, label: reqText.two};
  }
  // Spatika Mala => 1,00,000 Japas (1 Lakh)
  if (
    lower.includes('spatik') ||
    lower.includes('sphatik') ||
    lower.includes('crystal') ||
    lower.includes('quartz') ||
    lower.includes('స్పటిక') ||
    lower.includes('स्फटिक')
  ) {
    return {count: 100000, label: reqText.one};
  }
  // Karungali Mala => 50,000 Japas (50k)
  if (
    lower.includes('karungali') ||
    lower.includes('ebony') ||
    lower.includes('black wood') ||
    lower.includes('sacred japa mala') ||
    lower.includes('కరుంగాలి') ||
    lower.includes('கருங்காலி') ||
    lower.includes('करुंगली')
  ) {
    return {count: 50000, label: reqText.fiftyK};
  }
  return {count: 0, label: 'Standard'};
};

export const checkRewardEligibility = (
  rewardName: string,
  userJapaCount: number = 0,
  lang: string = 'en',
): RewardEligibility => {
  const req = getRewardRequirement(rewardName, lang);
  const count = Number(userJapaCount) || 0;
  const isEligible = req.count <= 0 || count >= req.count;
  const remainingJapas = isEligible ? 0 : Math.max(0, req.count - count);
  return {
    requiredJapas: req.count,
    requiredLabel: req.label,
    isEligible,
    remainingJapas,
  };
};

/**
 * Canonical display order:
 * 1. Rudraksha Mala / Rudrakshi Mala
 * 2. Tulasi Mala
 * 3. Pasupu Mala
 * 4. Karungali Mala (50k eligibility)
 * 5. Spatik Mala (1 Lakh eligibility)
 * 6. Green Agate (2 Lakhs eligibility)
 * 7. Yellow Agate (2 Lakhs eligibility)
 */
export const getRewardSortRank = (rewardName: string): number => {
  const lower = String(rewardName || '').toLowerCase();
  if (lower.includes('rudraksh')) return 1;
  if (lower.includes('tulasi') || lower.includes('tulsi')) return 2;
  if (lower.includes('pasupu') || lower.includes('turmeric') || lower.includes('haldi')) return 3;
  if (
    lower.includes('karungali') ||
    lower.includes('ebony') ||
    lower.includes('black wood') ||
    lower.includes('sacred japa mala')
  ) {
    return 4;
  }
  if (
    lower.includes('spatik') ||
    lower.includes('sphatik') ||
    lower.includes('crystal') ||
    lower.includes('quartz') ||
    lower.includes('స్పటిక') ||
    lower.includes('स्फटिक')
  ) {
    return 5;
  }
  if (
    lower.includes('green agate') ||
    (lower.includes('green') && (lower.includes('agate') || lower.includes('hakik')))
  ) {
    return 6;
  }
  if (
    lower.includes('yellow agate') ||
    (lower.includes('yellow') && (lower.includes('agate') || lower.includes('hakik')))
  ) {
    return 7;
  }
  return 99;
};

export const sortRewardsCanonical = <T extends {name?: string}>(list: T[]): T[] => {
  return [...list].sort((a, b) => {
    const rankA = getRewardSortRank(a.name || '');
    const rankB = getRewardSortRank(b.name || '');
    if (rankA !== rankB) {
      return rankA - rankB;
    }
    return String(a.name || '').localeCompare(String(b.name || ''));
  });
};
